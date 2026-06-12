import { describe, it, expect } from 'vitest';
import {
  bilinearKernel,
  bicubicKernel,
  lanczosKernel,
  getKernelFunction,
  getScaleMatrix,
  getKernelWeights,
  getKernelRadius,
  downsampleImage,
} from '@/lib/interpolation';

describe('interpolation.ts', () => {
  describe('bilinearKernel', () => {
    it('returns 1 at distance 0', () => {
      expect(bilinearKernel(0)).toBe(1);
    });

    it('returns 0 at distance >= 1', () => {
      expect(bilinearKernel(1)).toBe(0);
      expect(bilinearKernel(2)).toBe(0);
    });

    it('handles negative distances', () => {
      expect(bilinearKernel(-0.5)).toBe(0.5);
    });

    it('returns value between 0 and 1 for 0 < x < 1', () => {
      expect(bilinearKernel(0.5)).toBe(0.5);
    });
  });

  describe('bicubicKernel', () => {
    it('returns 1 at distance 0', () => {
      expect(bicubicKernel(0)).toBe(1);
    });

    it('returns 0 at distance >= 2', () => {
      expect(bicubicKernel(2)).toBe(0);
      expect(bicubicKernel(3)).toBe(0);
    });

    it('returns positive value for 0 < x < 1', () => {
      expect(bicubicKernel(0.5)).toBeGreaterThan(0);
      expect(bicubicKernel(0.5)).toBeLessThan(1);
    });

    it('may be negative for 1 < x < 2', () => {
      const result = bicubicKernel(1.5);
      expect(typeof result).toBe('number');
      expect(result).toBeGreaterThan(-0.5);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('handles negative distances', () => {
      expect(bicubicKernel(-1)).toBe(bicubicKernel(1));
    });

    it('respects a parameter', () => {
      const defaultResult = bicubicKernel(0.5);
      const customResult = bicubicKernel(0.5, -0.75);
      expect(defaultResult).not.toBe(customResult);
    });
  });

  describe('lanczosKernel', () => {
    it('returns 1 at distance 0', () => {
      expect(lanczosKernel(0)).toBe(1);
    });

    it('returns 0 at distance >= a', () => {
      expect(lanczosKernel(3, 3)).toBe(0);
      expect(lanczosKernel(4, 3)).toBe(0);
    });

    it('returns positive value for 0 < x < a', () => {
      expect(lanczosKernel(1, 3)).toBeGreaterThan(0);
      expect(lanczosKernel(1, 3)).toBeLessThan(1);
    });

    it('handles negative distances', () => {
      expect(lanczosKernel(-1, 3)).toBe(lanczosKernel(1, 3));
    });

    it('oscillates in valid range', () => {
      const result = lanczosKernel(1.5, 3);
      expect(result).not.toBeNaN();
    });
  });

  describe('getKernelFunction', () => {
    it('returns bilinear kernel', () => {
      const fn = getKernelFunction('bilinear');
      expect(fn(0)).toBe(1);
    });

    it('returns bicubic kernel', () => {
      const fn = getKernelFunction('bicubic');
      expect(fn(0)).toBe(1);
    });

    it('returns lanczos kernel', () => {
      const fn = getKernelFunction('lanczos');
      expect(fn(0)).toBe(1);
    });
  });

  describe('getKernelRadius', () => {
    it('returns 1 for bilinear', () => {
      expect(getKernelRadius('bilinear')).toBe(1);
    });

    it('returns 2 for bicubic', () => {
      expect(getKernelRadius('bicubic')).toBe(2);
    });

    it('returns 3 for lanczos', () => {
      expect(getKernelRadius('lanczos')).toBe(3);
    });
  });

  describe('getScaleMatrix', () => {
    it('calculates correct scale factors', () => {
      const matrix = getScaleMatrix(1000, 1000, 500, 500);
      expect(matrix[0]).toBe(2);
      expect(matrix[1]).toBe(2);
      expect(matrix[2]).toBe(0.5);
      expect(matrix[3]).toBe(0.5);
    });

    it('handles different aspect ratios', () => {
      const matrix = getScaleMatrix(1920, 1080, 640, 360);
      expect(matrix[0]).toBe(3);
      expect(matrix[1]).toBe(3);
      expect(matrix[2]).toBeCloseTo(0.333);
    });
  });

  describe('getKernelWeights', () => {
    it('returns weights for bilinear kernel', () => {
      const weights = getKernelWeights(0, 0, 2, 'bilinear');
      expect(weights.length).toBeGreaterThan(0);
      weights.forEach(({ weight }) => {
        expect(weight).toBeGreaterThan(0);
      });
    });

    it('returns weights for bicubic kernel', () => {
      const weights = getKernelWeights(0, 0, 2, 'bicubic');
      expect(weights.length).toBeGreaterThan(0);
    });

    it('returns weights for lanczos kernel', () => {
      const weights = getKernelWeights(0, 0, 2, 'lanczos');
      expect(weights.length).toBeGreaterThan(0);
    });
  });

  describe('downsampleImage', () => {
    it('downsamples an image correctly', () => {
      const srcPixels = new Uint8ClampedArray(100 * 100 * 4).fill(200);
      const result = downsampleImage(srcPixels, 100, 100, 50, 50, 'bilinear');

      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
      expect(result.pixels.length).toBe(50 * 50 * 4);
    });

    it('handles different kernels', () => {
      const srcPixels = new Uint8ClampedArray(100 * 100 * 4).fill(150);
      const bilinear = downsampleImage(srcPixels, 100, 100, 50, 50, 'bilinear');
      const bicubic = downsampleImage(srcPixels, 100, 100, 50, 50, 'bicubic');
      const lanczos = downsampleImage(srcPixels, 100, 100, 50, 50, 'lanczos');

      expect(bilinear.width).toBe(bicubic.width);
      expect(bilinear.width).toBe(lanczos.width);
    });

    it('preserves uniform color', () => {
      const srcPixels = new Uint8ClampedArray(100 * 100 * 4).fill(180);
      const result = downsampleImage(srcPixels, 100, 100, 25, 25, 'bilinear');

      for (let i = 0; i < result.pixels.length; i += 4) {
        expect(result.pixels[i]).toBeCloseTo(180, 0);
      }
    });

    it('handles edge case dimensions gracefully', () => {
      const srcPixels = new Uint8ClampedArray(100 * 100 * 4).fill(128);
      const result = downsampleImage(srcPixels, 100, 100, 1, 1, 'bilinear');
      expect(result.width).toBe(1);
      expect(result.height).toBe(1);
    });
  });
});