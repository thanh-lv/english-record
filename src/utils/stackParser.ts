export interface ParsedErrorLocation {
  fileName?: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  functionName?: string;
  rawLocation?: string;
  cleanStack?: string[];
}

/**
 * Clean URL and query parameters from file path (e.g. http://localhost:5173/src/App.tsx?t=123 -> src/App.tsx)
 */
function cleanFilePath(rawPath: string): string {
  if (!rawPath) return '';
  let cleaned = rawPath.replace(/\?.*$/, ''); // Remove query string
  // Remove protocol and host if present
  cleaned = cleaned.replace(/^https?:\/\/[^/]+\//, '');
  // Remove leading file:// or webpack://
  cleaned = cleaned.replace(/^(file|webpack|turbopack):\/\//, '');
  // Trim leading slashes
  cleaned = cleaned.replace(/^\/+/, '');
  return cleaned;
}

/**
 * Extracts the file basename from a full path (e.g. src/components/teacher/TopicsManager.tsx -> TopicsManager.tsx)
 */
function extractBaseName(filePath: string): string {
  const parts = filePath.split('/');
  return parts[parts.length - 1] || filePath;
}

/**
 * Universal error stack trace parser supporting Chrome, Safari, Firefox and Node.js
 */
export function parseErrorStack(stack?: string | null): ParsedErrorLocation {
  if (!stack || typeof stack !== 'string') {
    return {};
  }

  const lines = stack
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  const cleanFrames: string[] = [];

  let topLocation: ParsedErrorLocation | null = null;

  for (const line of lines) {
    let func = '';
    let rawFile = '';
    let lineNo = 0;
    let colNo = 0;

    // Pattern 1: at functionName (path/to/file:line:col)
    const chromeParenMatch = line.match(/^at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)$/);
    if (chromeParenMatch) {
      func = chromeParenMatch[1].trim();
      rawFile = chromeParenMatch[2];
      lineNo = parseInt(chromeParenMatch[3], 10);
      colNo = parseInt(chromeParenMatch[4], 10);
    } else {
      // Pattern 2: at path/to/file:line:col
      const chromeNoParenMatch = line.match(/^at\s+(.+?):(\d+):(\d+)$/);
      if (chromeNoParenMatch) {
        rawFile = chromeNoParenMatch[1];
        lineNo = parseInt(chromeNoParenMatch[2], 10);
        colNo = parseInt(chromeNoParenMatch[3], 10);
      } else {
        // Pattern 3: functionName@path/to/file:line:col or path/to/file:line:col
        const safariMatch = line.match(/^(?:(.*?)@)?(.+?):(\d+):(\d+)$/);
        if (safariMatch) {
          func = (safariMatch[1] || '').trim();
          rawFile = safariMatch[2];
          lineNo = parseInt(safariMatch[3], 10);
          colNo = parseInt(safariMatch[4], 10);
        }
      }
    }

    if (rawFile && lineNo > 0) {
      const cleanedPath = cleanFilePath(rawFile);
      const baseName = extractBaseName(cleanedPath);

      const frameStr = func
        ? `at ${func} (${cleanedPath}:${lineNo}:${colNo})`
        : `at ${cleanedPath}:${lineNo}:${colNo}`;
      cleanFrames.push(frameStr);

      if (!topLocation && (cleanedPath.includes('src/') || !cleanedPath.includes('node_modules'))) {
        topLocation = {
          fileName: baseName,
          filePath: cleanedPath,
          lineNumber: lineNo,
          columnNumber: colNo,
          functionName: func || undefined,
          rawLocation: `${cleanedPath}:${lineNo}:${colNo}`,
        };
      }
      continue;
    }

    // Unmatched lines (headers, notes)
    if (
      !line.startsWith('Error') &&
      !line.startsWith('TypeError') &&
      !line.startsWith('ReferenceError')
    ) {
      cleanFrames.push(line);
    }
  }

  // Fallback to first frame if none in src/
  if (!topLocation && cleanFrames.length > 0) {
    const first = cleanFrames[0];
    const match = first.match(/(?:at (.+?) \()?(.*?):(\d+):(\d+)\)?$/);
    if (match) {
      const path = match[2];
      topLocation = {
        fileName: extractBaseName(path),
        filePath: path,
        lineNumber: parseInt(match[3], 10),
        columnNumber: parseInt(match[4], 10),
        functionName: match[1] || undefined,
        rawLocation: `${path}:${match[3]}:${match[4]}`,
      };
    }
  }

  return {
    ...topLocation,
    cleanStack: cleanFrames.slice(0, 10),
  };
}

/**
 * Format parsed error location as a compact badge string (e.g. "TopicsManager.tsx:142")
 */
export function formatLocationBadge(location?: ParsedErrorLocation): string {
  if (!location || !location.fileName) return '';
  if (location.lineNumber) {
    return `${location.fileName}:${location.lineNumber}`;
  }
  return location.fileName;
}
