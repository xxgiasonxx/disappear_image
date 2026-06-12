import { describe, it, expect } from 'vitest';
import {
  generateSecretPattern,
  generateTestPattern,
  pixelsToDataUrl,
  validateImageFile,
  MAX_FILE_SIZE,
} from '@/lib/imageUtils';

describe('imageUtils.ts', () => {
  describe('generateSecretPattern', () => {
    it('creates pattern with correct dimensions', () => {
      const pattern = generateSecretPattern(100, 200);
      expect(pattern.length).toBe(100 * 200 * 4);
    });

    it('has white center circle', () => {
      const pattern = generateSecretPattern(100, 100);
      const centerX = 50;
      const centerY = 50;
      const centerIdx = (centerY * 100 + centerX) * 4;
      expect(pattern[centerIdx]).toBe(255);
      expect(pattern[centerIdx + 1]).toBe(255);
      expect(pattern[centerIdx + 2]).toBe(255);
    });

    it('has black corners', () => {
      const pattern = generateSecretPattern(100, 100);
      const cornerIdx = (10 * 100 + 10) * 4;
      expect(pattern[cornerIdx]).toBe(0);
    });

    it('has cross pattern', () => {
      const pattern = generateSecretPattern(100, 100);
      const centerX = 50;
      const centerY = 50;

      const horizontalIdx = (centerY * 100 + 30) * 4;
      expect(pattern[horizontalIdx]).toBe(255);

      const verticalIdx = (30 * 100 + centerX) * 4;
      expect(pattern[verticalIdx]).toBe(255);
    });

    it('all pixels have alpha 255', () => {
      const pattern = generateSecretPattern(50, 50);
      for (let i = 3; i < pattern.length; i += 4) {
        expect(pattern[i]).toBe(255);
      }
    });

    it('handles small dimensions', () => {
      const pattern = generateSecretPattern(10, 10);
      expect(pattern.length).toBe(10 * 10 * 4);
    });
  });

  describe('generateTestPattern', () => {
    it('creates pattern with correct dimensions', () => {
      const pattern = generateTestPattern(100, 200);
      expect(pattern.length).toBe(100 * 200 * 4);
    });

    it('is brighter in center', () => {
      const pattern = generateTestPattern(100, 100);
      const centerIdx = (50 * 100 + 50) * 4;
      const cornerIdx = (5 * 100 + 5) * 4;
      const centerBrightness = pattern[centerIdx];
      const cornerBrightness = pattern[cornerIdx];
      expect(centerBrightness).toBeGreaterThan(cornerBrightness);
    });

    it('has checkboard pattern', () => {
      const pattern = generateTestPattern(32, 32);
      const idx1 = (8 * 32 + 8) * 4;
      const idx2 = (8 * 32 + 16) * 4;
      expect(pattern[idx1]).not.toBe(pattern[idx2]);
    });

    it('all pixels have alpha 255', () => {
      const pattern = generateTestPattern(50, 50);
      for (let i = 3; i < pattern.length; i += 4) {
        expect(pattern[i]).toBe(255);
      }
    });

    it('values are within valid range', () => {
      const pattern = generateTestPattern(100, 100);
      for (let i = 0; i < pattern.length; i += 4) {
        expect(pattern[i]).toBeGreaterThanOrEqual(0);
        expect(pattern[i]).toBeLessThanOrEqual(255);
      }
    });
  });

  describe('pixelsToDataUrl', () => {
    it('returns a string type', () => {
      const pixels = new Uint8ClampedArray(100 * 4);
      pixels[0] = 255;
      pixels[1] = 0;
      pixels[2] = 0;
      pixels[3] = 255;

      const dataUrl = pixelsToDataUrl(pixels, 10, 1);
      expect(typeof dataUrl).toBe('string');
    });

    it('handles zero dimensions gracefully', () => {
      const pixels = new Uint8ClampedArray(0);
      const dataUrl = pixelsToDataUrl(pixels, 0, 0);
      expect(dataUrl).toBe('');
    });
  });

  describe('validateImageFile', () => {
    it('returns null for valid JPEG', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      expect(validateImageFile(file)).toBeNull();
    });

    it('returns null for valid PNG', () => {
      const file = new File([''], 'test.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      expect(validateImageFile(file)).toBeNull();
    });

    it('returns null for valid WebP', () => {
      const file = new File([''], 'test.webp', { type: 'image/webp' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      expect(validateImageFile(file)).toBeNull();
    });

    it('returns error for file too large', () => {
      const file = new File([''], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 });
      expect(validateImageFile(file)).toBe('檔案大小必須小於 10MB');
    });

    it('returns error for invalid type', () => {
      const file = new File([''], 'test.gif', { type: 'image/gif' });
      Object.defineProperty(file, 'size', { value: 1024 * 1024 });
      expect(validateImageFile(file)).toBe('僅支援 JPEG、PNG、WebP 格式');
    });

    it('returns error for text/plain', () => {
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      Object.defineProperty(file, 'size', { value: 1024 });
      expect(validateImageFile(file)).toBe('僅支援 JPEG、PNG、WebP 格式');
    });
  });

  describe('MAX_FILE_SIZE', () => {
    it('is 10MB', () => {
      expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });
  });
});