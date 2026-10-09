import { describe, it, expect } from 'vitest';
import {
  medianCutQuantization,
  applyQuantization,
  buildCheckerboard,
  resizeImage,
} from '@/lib/xProcessor';
import {
  SCALE_OPTIONS,
  COLOR_OPTIONS,
  getCandidatePriority,
} from '@/lib/bruteForceXProcessor';

function createGradientImage(width: number, height: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      pixels[idx] = Math.round((x / (width - 1)) * 255);
      pixels[idx + 1] = Math.round((y / (height - 1)) * 255);
      pixels[idx + 2] = (x * 7 + y * 13) % 256;
      pixels[idx + 3] = 255;
    }
  }
  return pixels;
}

function countUniqueColors(rgba: Uint8ClampedArray): number {
  const colors = new Set<number>();
  for (let i = 0; i < rgba.length; i += 4) {
    colors.add((rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2]);
  }
  return colors.size;
}

describe('xProcessor.ts', () => {
  describe('medianCutQuantization', () => {
    it('returns at most numColors colors', () => {
      const pixels = createGradientImage(64, 64);
      for (const numColors of [32, 16, 8, 4, 2]) {
        expect(medianCutQuantization(pixels, numColors).length).toBeLessThanOrEqual(numColors);
      }
    });

    it('returns original colors when image has fewer colors than requested', () => {
      const pixels = new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 0, 255, 255,
        255, 0, 0, 255,
      ]);
      const palette = medianCutQuantization(pixels, 32);
      expect(palette).toHaveLength(2);
      expect(palette).toContainEqual([255, 0, 0]);
      expect(palette).toContainEqual([0, 0, 255]);
    });
  });

  describe('applyQuantization', () => {
    it('maps every pixel to a palette color with alpha 255', () => {
      const pixels = createGradientImage(32, 32);
      const palette = medianCutQuantization(pixels, 8);
      const quantized = applyQuantization(pixels, palette);
      const paletteKeys = new Set(palette.map(([r, g, b]) => (r << 16) | (g << 8) | b));

      for (let i = 0; i < quantized.length; i += 4) {
        const key = (quantized[i] << 16) | (quantized[i + 1] << 8) | quantized[i + 2];
        expect(paletteKeys.has(key)).toBe(true);
        expect(quantized[i + 3]).toBe(255);
      }
      expect(countUniqueColors(quantized)).toBeLessThanOrEqual(8);
    });
  });

  describe('buildCheckerboard', () => {
    it('keeps even cells opaque and makes odd cells fully transparent white', () => {
      const width = 5;
      const height = 4;
      const pixels = createGradientImage(width, height);
      const checkerboard = buildCheckerboard(pixels, width, height);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const cell = Array.from(checkerboard.slice(idx, idx + 4));
          if ((x + y) % 2 === 0) {
            expect(cell).toEqual([pixels[idx], pixels[idx + 1], pixels[idx + 2], 255]);
          } else {
            expect(cell).toEqual([255, 255, 255, 0]);
          }
        }
      }
    });
  });

  describe('resizeImage', () => {
    it('scales dimensions by the given factor', () => {
      const pixels = createGradientImage(100, 50);
      const [resized, width, height] = resizeImage(pixels, 100, 50, 0.4);
      expect(width).toBe(40);
      expect(height).toBe(20);
      expect(resized.length).toBe(40 * 20 * 4);
    });

    it('uses nearest-neighbor sampling', () => {
      const pixels = createGradientImage(10, 10);
      const [resized, width] = resizeImage(pixels, 10, 10, 0.5);
      const dstIdx = (1 * width + 2) * 4;
      const srcIdx = (2 * 10 + 4) * 4;
      expect(Array.from(resized.slice(dstIdx, dstIdx + 4))).toEqual(
        Array.from(pixels.slice(srcIdx, srcIdx + 4))
      );
    });
  });
});

describe('bruteForceXProcessor.ts', () => {
  describe('getCandidatePriority', () => {
    it('follows the same order as the greedy analytical search', () => {
      // 優化解的嘗試順序：scale=1.0 下 32→2 色，之後每次縮小 0.1 且只用 2 色
      const greedyOrder: [number, number][] = [
        ...COLOR_OPTIONS.map((c): [number, number] => [1.0, c]),
        ...SCALE_OPTIONS.slice(1).map((s): [number, number] => [s, 2]),
      ];
      const priorities = greedyOrder.map(([s, c]) => getCandidatePriority(s, c));
      expect(priorities).toEqual([...priorities].sort((a, b) => a - b));
      expect(new Set(priorities).size).toBe(priorities.length);
    });

    it('ranks combinations the greedy search never tries last', () => {
      expect(getCandidatePriority(0.7, 16)).toBe(Infinity);
      expect(getCandidatePriority(0.3, 2)).toBeLessThan(Infinity);
    });
  });
});
