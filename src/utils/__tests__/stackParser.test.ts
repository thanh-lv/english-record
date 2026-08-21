import { describe, it, expect } from 'vitest';
import { parseErrorStack, formatLocationBadge } from '../stackParser';

describe('stackParser', () => {
  it('parses Chrome / V8 stack trace format correctly', () => {
    const chromeStack = `TypeError: Cannot read properties of undefined (reading 'questions')
    at confirmDelete (http://localhost:5173/src/components/teacher/topics/TopicsManager.tsx?t=178732:142:15)
    at onClick (http://localhost:5173/src/components/common/DeleteConfirmModal.tsx:58:11)
    at HTMLButtonElement.dispatch (http://localhost:5173/node_modules/react-dom/client.js:123:4)`;

    const parsed = parseErrorStack(chromeStack);
    expect(parsed.fileName).toBe('TopicsManager.tsx');
    expect(parsed.filePath).toBe('src/components/teacher/topics/TopicsManager.tsx');
    expect(parsed.lineNumber).toBe(142);
    expect(parsed.columnNumber).toBe(15);
    expect(parsed.functionName).toBe('confirmDelete');
    expect(parsed.cleanStack?.length).toBeGreaterThanOrEqual(2);
  });

  it('parses Safari stack trace format correctly', () => {
    const safariStack = `confirmDelete@http://localhost:5173/src/components/teacher/topics/TopicsManager.tsx:142:15
onClick@http://localhost:5173/src/components/common/DeleteConfirmModal.tsx:58:11
dispatch@http://localhost:5173/node_modules/react-dom/client.js:123:4`;

    const parsed = parseErrorStack(safariStack);
    expect(parsed.fileName).toBe('TopicsManager.tsx');
    expect(parsed.filePath).toBe('src/components/teacher/topics/TopicsManager.tsx');
    expect(parsed.lineNumber).toBe(142);
    expect(parsed.columnNumber).toBe(15);
    expect(parsed.functionName).toBe('confirmDelete');
  });

  it('formats location badge string properly', () => {
    expect(formatLocationBadge({ fileName: 'TopicsManager.tsx', lineNumber: 142 })).toBe(
      'TopicsManager.tsx:142'
    );
    expect(formatLocationBadge({ fileName: 'App.tsx' })).toBe('App.tsx');
    expect(formatLocationBadge(undefined)).toBe('');
  });

  it('handles empty or undefined stack safely without throwing', () => {
    expect(parseErrorStack(undefined)).toEqual({});
    expect(parseErrorStack('')).toEqual({});
  });
});
