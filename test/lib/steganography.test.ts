import { describe, it, expect } from 'vitest';
import { hideImageAnalytical } from '@/lib/analytical';
import { hideImageBruteForce } from '@/lib/bruteForce';
import type { ImageDataTyped, StegoConfig } from '@/lib/types';

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

function createSecretPattern(width: number, height: number): ImageDataTyped {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const inCircle = (x - width / 2) ** 2 + (y - height / 2) ** 2 < (width / 4) ** 2;
      if (inCircle) {
        pixels[idx] = 255;
        pixels[idx + 1] = 255;
        pixels[idx + 2] = 255;
      } else {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
      }
      pixels[idx + 3] = 255;
    }
  }
  return { width, height, pixels };
}

describe('analytical.ts', () => {
  const defaultConfig: StegoConfig = {
    backgroundColor: 'white',
    interpolationKernel: 'bilinear',
    targetWidth: 100,
    targetHeight: 100,
    strength: 0.8,
    tileSize: 64,
    overlap: 8,
  };

  it('hides secret image in carrier successfully', () => {
    const coverImage = createTestImage(200, 200, 128);
    const secretImage = createSecretPattern(50, 50);

    const result = hideImageAnalytical(coverImage, secretImage, defaultConfig);

    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
    expect(result.pixels.length).toBe(200 * 200 * 4);
  });

  it('modifies carrier pixels when hiding secret', () => {
    const coverImage = createTestImage(200, 200, 128);
    const secretImage = createSecretPattern(50, 50);

    const result = hideImageAnalytical(coverImage, secretImage, defaultConfig);

    const areEqual = coverImage.pixels.every((val, i) => val === result.pixels[i]);
    expect(areEqual).toBe(false);
  });

  it('works with different interpolation kernels', { timeout: 30000 }, () => {
    const coverImage = createTestImage(100, 100, 128);
    const secretImage = createSecretPattern(25, 25);
    const kernels: ['bilinear', 'bicubic', 'lanczos'] = ['bilinear', 'bicubic', 'lanczos'];

    kernels.forEach((kernel) => {
      const config = { ...defaultConfig, interpolationKernel: kernel, tileSize: 50, overlap: 4 };
      const result = hideImageAnalytical(coverImage, secretImage, config);
      expect(result.pixels.length).toBe(100 * 100 * 4);
    });
  });

  it('works with black background', () => {
    const coverImage = createTestImage(200, 200, 128);
    const secretImage = createSecretPattern(50, 50);
    const config = { ...defaultConfig, backgroundColor: 'black' };

    const result = hideImageAnalytical(coverImage, secretImage, config);

    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });

  it('handles large images', { timeout: 30000 }, () => {
    const coverImage = createTestImage(200, 200, 128);
    const secretImage = createSecretPattern(50, 50);
    const config = {
      ...defaultConfig,
      targetWidth: 100,
      targetHeight: 100,
      tileSize: 64,
      overlap: 8,
    };

    const result = hideImageAnalytical(coverImage, secretImage, config);

    expect(result.width).toBe(200);
    expect(result.height).toBe(200);
  });
});

describe('bruteForce.ts', () => {
  const defaultConfig: StegoConfig = {
    backgroundColor: 'white',
    interpolationKernel: 'bilinear',
    targetWidth: 50,
    targetHeight: 50,
    strength: 0.8,
    tileSize: 32,
    overlap: 4,
  };

  it('hides secret image in carrier', () => {
    const coverImage = createTestImage(100, 100, 128);
    const secretImage = createSecretPattern(25, 25);

    const result = hideImageBruteForce(coverImage, secretImage, defaultConfig);

    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
    expect(result.pixels.length).toBe(100 * 100 * 4);
  });

  it('modifies carrier pixels', () => {
    const coverImage = createTestImage(100, 100, 128);
    const secretImage = createSecretPattern(25, 25);

    const result = hideImageBruteForce(coverImage, secretImage, defaultConfig);

    const areEqual = coverImage.pixels.every((val, i) => val === result.pixels[i]);
    expect(areEqual).toBe(false);
  });

  it('works with different background colors', () => {
    const coverImage = createTestImage(100, 100, 128);
    const secretImage = createSecretPattern(25, 25);

    const whiteConfig = { ...defaultConfig, backgroundColor: 'white' as const };
    const blackConfig = { ...defaultConfig, backgroundColor: 'black' as const };

    const whiteResult = hideImageBruteForce(coverImage, secretImage, whiteConfig);
    const blackResult = hideImageBruteForce(coverImage, secretImage, blackConfig);

    expect(whiteResult.pixels).not.toEqual(blackResult.pixels);
  });

  it('handles edge case target size', () => {
    const coverImage = createTestImage(100, 100, 128);
    const secretImage = createSecretPattern(10, 10);
    const config = { ...defaultConfig, targetWidth: 1, targetHeight: 1 };

    const result = hideImageBruteForce(coverImage, secretImage, config);

    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  });
});

describe('Analytical vs Brute Force comparison', () => {
  const config: StegoConfig = {
    backgroundColor: 'white',
    interpolationKernel: 'bilinear',
    targetWidth: 50,
    targetHeight: 50,
    strength: 0.8,
    tileSize: 32,
    overlap: 4,
  };

  it('both algorithms return valid results', () => {
    const coverImage = createTestImage(100, 100, 128);
    const secretImage = createSecretPattern(25, 25);

    const analyticalResult = hideImageAnalytical(coverImage, secretImage, config);
    const bruteForceResult = hideImageBruteForce(coverImage, secretImage, config);

    expect(analyticalResult.pixels.length).toBeGreaterThan(0);
    expect(bruteForceResult.pixels.length).toBeGreaterThan(0);
  });

  it('results have different pixel modifications', () => {
    const coverImage = createTestImage(100, 100, 128);
    const secretImage = createSecretPattern(25, 25);

    const analyticalResult = hideImageAnalytical(coverImage, secretImage, config);
    const bruteForceResult = hideImageBruteForce(coverImage, secretImage, config);

    expect(analyticalResult.pixels).not.toEqual(bruteForceResult.pixels);
  });
});
