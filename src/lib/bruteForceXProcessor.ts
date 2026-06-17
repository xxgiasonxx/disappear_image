import UPNG from 'upng-js';
import { loadImageToPixels } from '@lib/imageUtils';
import {
  medianCutQuantization,
  applyQuantization,
  buildCheckerboard,
  upscaleImage,
  resizeImage,
} from '@lib/xProcessor';
import type { XProcessResult } from '@lib/xProcessor';

export type { XProcessResult } from '@lib/xProcessor';

interface CalculatedCandidate {
  blob: Blob;
  width: number;
  height: number;
  scale: number;
  numColors: number;
  originalOrderIndex: number;
}

const MAX_SIZE = 1024 * 1024;

export async function bruteForceXProcess(file: File): Promise<XProcessResult> {
  try {
    const imageData = await loadImageToPixels(file);
    const { pixels, width, height } = imageData;

    const MIN_SIZE = 1000;
    const [upscaledPixels, upscaledWidth, upscaledHeight] =
      (width < MIN_SIZE || height < MIN_SIZE)
        ? upscaleImage(pixels, width, height, MIN_SIZE)
        : [new Uint8ClampedArray(pixels), width, height];

    const scaleOptions = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
    const colorOptions = [32, 16, 8, 4, 2];

    const allCalculatedResults: CalculatedCandidate[] = [];

    for (const scale of scaleOptions) {
      const currentWidth = Math.round(upscaledWidth * scale);
      const currentHeight = Math.round(upscaledHeight * scale);

      const currentPixels = (scale === 1.0)
        ? new Uint8ClampedArray(upscaledPixels)
        : resizeImage(new Uint8ClampedArray(upscaledPixels), upscaledWidth, upscaledHeight, scale)[0];

      for (const numColors of colorOptions) {
        const palette = medianCutQuantization(currentPixels, numColors);
        const quantized = applyQuantization(currentPixels, palette);
        const checkerboard = buildCheckerboard(quantized, currentWidth, currentHeight);

        const pngBuffer = UPNG.encode(
          [checkerboard.buffer as ArrayBuffer],
          currentWidth,
          currentHeight,
          0
        );

        const blob = new Blob([pngBuffer], { type: 'image/png' });

        let originalOrderIndex = Infinity;
        if (scale === 1.0) {
          if (numColors === 32) originalOrderIndex = 0;
          else if (numColors === 16) originalOrderIndex = 1;
          else if (numColors === 8) originalOrderIndex = 2;
          else if (numColors === 4) originalOrderIndex = 3;
          else if (numColors === 2) originalOrderIndex = 4;
        } else {
          if (numColors === 2) {
            const scaleStep = Math.round((1.0 - scale) * 10);
            originalOrderIndex = 4 + scaleStep;
          }
        }

        if (blob.size <= MAX_SIZE) {
          allCalculatedResults.push({
            blob,
            width: currentWidth,
            height: currentHeight,
            scale,
            numColors,
            originalOrderIndex,
          });
        }
      }
    }

    if (allCalculatedResults.length === 0) {
      return {
        success: false,
        error: '無法將圖片壓縮至 1MB 以內',
      };
    }

    allCalculatedResults.sort((a, b) => a.originalOrderIndex - b.originalOrderIndex);

    const exactSameMatch = allCalculatedResults[0];

    const previewUrl = URL.createObjectURL(exactSameMatch.blob);
    return {
      success: true,
      blob: exactSameMatch.blob,
      previewUrl,
      width: exactSameMatch.width,
      height: exactSameMatch.height,
      sizeInMB: (exactSameMatch.blob.size / (1024 * 1024)).toFixed(2),
      method: 'brute-force',
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '圖片處理失敗',
    };
  }
}