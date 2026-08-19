/* eslint-disable no-control-regex */
/**
 * @file security.ts
 * @description
 * High-grade input sanitization and XSS protection utilities to prevent
 * Cross-Site Scripting (XSS), script injection, and malicious URL protocols
 * across all client-side forms and API submission payloads.
 *
 * @module utils/security
 */

/**
 * HTML entities map for escaping special characters
 */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

const HTML_ESCAPE_REGEX = /[&<>"'`=/]/g;

/**
 * Escapes unsafe HTML characters to prevent XSS injection.
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str).replace(HTML_ESCAPE_REGEX, char => HTML_ESCAPES[char] || char);
}

/**
 * Strips dangerous HTML tags and event handlers from strings.
 */
export function sanitizeXSS(str: string | null | undefined): string {
  if (!str) return '';

  return (
    String(str)
      // Strip control characters
      .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
      // Remove script tags and contents
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove iframe, object, embed, form tags
      .replace(/<\/?(?:iframe|object|embed|form|link|style|base|meta)\b[^>]*>/gi, '')
      // Remove inline event handlers like onerror, onclick, onload, etc.
      .replace(/\s*on\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '')
      // Remove javascript: and vbscript: pseudo-protocols
      .replace(/(?:javascript|vbscript|data):[^\s]+/gi, '')
      .trim()
  );
}

/**
 * Sanitizes generic user input text by removing control characters,
 * stripping XSS vectors, and trimming whitespace.
 */
export function sanitizeInput(text: string | null | undefined): string {
  if (!text) return '';
  return sanitizeXSS(text);
}

/**
 * Validates and sanitizes URLs, blocking unsafe protocols like javascript:
 */
export function sanitizeSafeUrl(url: string | null | undefined): string | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();

  // Block javascript:, vbscript:, data:text/html protocols
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('data:text/html') ||
    lower.startsWith('data:application/javascript')
  ) {
    return null;
  }

  return trimmed;
}
