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

export const SCALE_OPTIONS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
export const COLOR_OPTIONS = [32, 16, 8, 4, 2];

// 與優化解相同的優先順序：先用原解析度試 32→2 色，不行才降解析度（只用 2 色）
export function getCandidatePriority(scale: number, numColors: number): number {
  if (scale === 1.0) {
    const colorIndex = COLOR_OPTIONS.indexOf(numColors);
    return colorIndex === -1 ? Infinity : colorIndex;
  }
  if (numColors === 2) {
    return 4 + Math.round((1.0 - scale) * 10);
  }
  return Infinity;
}

export async function bruteForceXProcess(file: File): Promise<XProcessResult> {
  try {
    const imageData = await loadImageToPixels(file);
    const { pixels, width, height } = imageData;

    const MIN_SIZE = 1000;
    const [upscaledPixels, upscaledWidth, upscaledHeight] =
      (width < MIN_SIZE || height < MIN_SIZE)
        ? upscaleImage(pixels, width, height, MIN_SIZE)
        : [new Uint8ClampedArray(pixels), width, height];

    const allCalculatedResults: CalculatedCandidate[] = [];

    for (const scale of SCALE_OPTIONS) {
      const currentWidth = Math.round(upscaledWidth * scale);
      const currentHeight = Math.round(upscaledHeight * scale);

      const currentPixels = (scale === 1.0)
        ? new Uint8ClampedArray(upscaledPixels)
        : resizeImage(new Uint8ClampedArray(upscaledPixels), upscaledWidth, upscaledHeight, scale)[0];

      for (const numColors of COLOR_OPTIONS) {
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

        const originalOrderIndex = getCandidatePriority(scale, numColors);

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