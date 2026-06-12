import { describe, it, expect } from 'vitest';
import { calculateMSE, calculatePSNR, calculateSSIM } from '@/lib/metrics';
import type { ImageDataTyped } from '@/lib/types';

function createTestImage(width: number, height: number, value: number = 128): ImageDataTyped {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
    pixels[i + 3] = 255;
  }
  return { width, height, pixels };
}

describe('metrics.ts', () => {
  describe('calculateMSE', () => {
    it('returns 0 for identical images', () => {
      const imageA = createTestImage(10, 10, 128);
      const imageB = createTestImage(10, 10, 128);

      expect(calculateMSE(imageA, imageB)).toBe(0);
    });

    it('returns correct value for different images', () => {
      const imageA = createTestImage(10, 10, 100);
      const imageB = createTestImage(10, 10, 150);

      const mse = calculateMSE(imageA, imageB);
      expect(mse).toBeGreaterThan(0);
    });

    it('throws error for different dimensions', () => {
      const imageA = createTestImage(10, 10);
      const imageB = createTestImage(20, 20);

      expect(() => calculateMSE(imageA, imageB)).toThrow('Images must have the same dimensions');
    });
  });

  describe('calculatePSNR', () => {
    it('returns Infinity for identical images', () => {
      const imageA = createTestImage(10, 10, 128);
      const imageB = createTestImage(10, 10, 128);

      expect(calculatePSNR(imageA, imageB)).toBe(Infinity);
    });

    it('returns a finite value for different images', () => {
      const imageA = createTestImage(10, 10, 100);
      const imageB = createTestImage(10, 10, 200);

      const psnr = calculatePSNR(imageA, imageB);
      expect(psnr).toBeGreaterThan(0);
      expect(isFinite(psnr)).toBe(true);
    });
  });

  describe('calculateSSIM', () => {
    it('returns 1 for identical images', () => {
      const imageA = createTestImage(16, 16, 128);
      const imageB = createTestImage(16, 16, 128);

      const ssim = calculateSSIM(imageA, imageB);
      expect(ssim).toBeCloseTo(1, 1);
    });

    it('returns value less than 1 for different images', () => {
      const imageA = createTestImage(16, 16, 100);
      const imageB = createTestImage(16, 16, 200);

      const ssim = calculateSSIM(imageA, imageB);
      expect(ssim).toBeLessThan(1);
    });

    it('throws error for different dimensions', () => {
      const imageA = createTestImage(16, 16);
      const imageB = createTestImage(32, 32);

      expect(() => calculateSSIM(imageA, imageB)).toThrow('Images must have the same dimensions');
    });
  });
});