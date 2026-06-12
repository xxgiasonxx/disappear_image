import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  validateFileType,
  validateFileSize,
  sanitizeHtml,
  validateImageDimensions,
} from '@/utils/validation';

describe('validation.ts', () => {
  describe('escapeHtml', () => {
    it('escapes less than sign', () => {
      expect(escapeHtml('<')).toBe('&lt;');
    });

    it('escapes greater than sign', () => {
      expect(escapeHtml('>')).toBe('&gt;');
    });

    it('escapes ampersand', () => {
      expect(escapeHtml('&')).toBe('&amp;');
    });

    it('escapes double quotes', () => {
      expect(escapeHtml('"')).toBe('&quot;');
    });

    it('escapes single quotes', () => {
      expect(escapeHtml("'")).toBe('&#x27;');
    });

    it('escapes multiple dangerous characters', () => {
      const input = '<script>alert("xss")</script>';
      const result = escapeHtml(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).not.toContain('<script>');
    });

    it('leaves safe text unchanged', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
      expect(escapeHtml('12345')).toBe('12345');
    });

    it('handles empty string', () => {
      expect(escapeHtml('')).toBe('');
    });

    it('handles mixed safe and unsafe', () => {
      expect(escapeHtml('Hello <world>')).toBe('Hello &lt;world&gt;');
    });
  });

  describe('validateFileType', () => {
    it('accepts JPEG', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      expect(validateFileType(file)).toBe(true);
    });

    it('accepts PNG', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      expect(validateFileType(file)).toBe(true);
    });

    it('accepts WebP', () => {
      const file = new File([''], 'test.webp', { type: 'image/webp' });
      expect(validateFileType(file)).toBe(true);
    });

    it('rejects GIF', () => {
      const file = new File([''], 'test.gif', { type: 'image/gif' });
      expect(validateFileType(file)).toBe(false);
    });
  });

  describe('validateFileSize', () => {
    it('accepts small file', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      expect(validateFileSize(file)).toBe(true);
    });

    it('accepts file at exactly 10MB', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 });
      expect(validateFileSize(file)).toBe(true);
    });

    it('rejects file larger than 10MB', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 10 * 1024 * 1024 + 1 });
      expect(validateFileSize(file)).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('escapes HTML tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toContain('&lt;script&gt;');
    });

    it('leaves plain text unchanged', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('validateImageDimensions', () => {
    it('accepts valid dimensions', () => {
      expect(validateImageDimensions(500, 500, 1000, 1000)).toBe(true);
    });

    it('accepts equal dimensions', () => {
      expect(validateImageDimensions(1000, 1000, 1000, 1000)).toBe(true);
    });

    it('rejects oversized width', () => {
      expect(validateImageDimensions(1500, 500, 1000, 1000)).toBe(false);
    });

    it('rejects oversized height', () => {
      expect(validateImageDimensions(500, 1500, 1000, 1000)).toBe(false);
    });
  });
});