import UPNG from 'upng-js';
import { loadImageToPixels } from '@lib/imageUtils';

export interface ColorValue {
  r: number;
  g: number;
  b: number;
  count: number;
}

export interface ColorBox {
  colors: ColorValue[];
  minR: number; maxR: number;
  minG: number; maxG: number;
  minB: number; maxB: number;
}

export function computeBoxStats(colors: ColorValue[]): ColorBox {
  let minR = 255, minG = 255, minB = 255;
  let maxR = 0, maxG = 0, maxB = 0;

  for (const c of colors) {
    if (c.r < minR) minR = c.r; if (c.r > maxR) maxR = c.r;
    if (c.g < minG) minG = c.g; if (c.g > maxG) maxG = c.g;
    if (c.b < minB) minB = c.b; if (c.b > maxB) maxB = c.b;
  }

  return { colors, minR, maxR, minG, maxG, minB, maxB };
}

export function splitBoxAtMedian(box: ColorBox): [ColorBox, ColorBox] {
  const rangeR = box.maxR - box.minR;
  const rangeG = box.maxG - box.minG;
  const rangeB = box.maxB - box.minB;

  // 找到範圍最大的維度
  const channel: 'r' | 'g' | 'b' =
    rangeR >= rangeG && rangeR >= rangeB ? 'r'
    : rangeG >= rangeB ? 'g'
    : 'b';

  // 按該維度排序
  const sorted = [...box.colors].sort((a, b) => a[channel] - b[channel]);

  // 找到中位點（根據像素的數量來加權）
  let totalCount = 0;
  for (const c of sorted) totalCount += c.count;

  let halfCount = 0;
  let splitIndex = 0;
  for (let i = 0; i < sorted.length; i++) {
    halfCount += sorted[i].count;
    if (halfCount >= totalCount / 2) {
      splitIndex = i + 1;
      break;
    }
  }
  if (splitIndex === 0 || splitIndex >= sorted.length) {
    splitIndex = Math.floor(sorted.length / 2);
  }

  return [
    computeBoxStats(sorted.slice(0, splitIndex)),
    computeBoxStats(sorted.slice(splitIndex)),
  ];
}

export function findBoxToSplit(boxes: ColorBox[]): number {
  // 找到包含最多總像素的盒子（或最大顏色範圍的盒子）
  let bestIndex = 0;
  let bestCount = 0;

  for (let i = 0; i < boxes.length; i++) {
    const box = boxes[i];
    let count = 0;
    for (const c of box.colors) count += c.count;
    if (count > bestCount) {
      bestCount = count;
      bestIndex = i;
    }
  }

  return bestIndex;
}

export function averageColor(colors: ColorValue[]): [number, number, number] {
  let r = 0, g = 0, b = 0, totalCount = 0;
  for (const c of colors) {
    r += c.r * c.count;
    g += c.g * c.count;
    b += c.b * c.count;
    totalCount += c.count;
  }
  return [
    Math.round(r / totalCount),
    Math.round(g / totalCount),
    Math.round(b / totalCount),
  ];
}

export function buildColorHistogram(rgba: Uint8ClampedArray): Map<number, ColorValue> {
  const histogram = new Map<number, ColorValue>();

  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const key = (r << 16) | (g << 8) | b;

    const existing = histogram.get(key);
    if (existing) {
      existing.count++;
    } else {
      histogram.set(key, { r, g, b, count: 1 });
    }
  }

  return histogram;
}

export function medianCutQuantization(
  rgba: Uint8ClampedArray,
  numColors: number
): [number, number, number][] {
  const histogram = buildColorHistogram(rgba);
  const colors = Array.from(histogram.values());

  if (colors.length === 0) return [[0, 0, 0]];
  if (colors.length <= numColors) {
    return colors.map(c => [c.r, c.g, c.b]);
  }

  let boxes: ColorBox[] = [computeBoxStats(colors)];

  while (boxes.length < numColors) {
    const boxIndex = findBoxToSplit(boxes);
    const box = boxes[boxIndex];

    if (box.colors.length <= 1) break;

    const [left, right] = splitBoxAtMedian(box);
    boxes = [...boxes.slice(0, boxIndex), ...boxes.slice(boxIndex + 1), left, right];
  }

  return boxes.map(box => averageColor(box.colors));
}

export function applyQuantization(
  rgba: Uint8ClampedArray,
  palette: [number, number, number][]
): Uint8ClampedArray {
  const result = new Uint8ClampedArray(rgba.length);

  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];

    // 找到最近的調色盤顏色
    let minDist = Infinity;
    let closest = palette[0];

    for (const [pr, pg, pb] of palette) {
      const dist = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
      if (dist < minDist) {
        minDist = dist;
        closest = [pr, pg, pb];
      }
    }

    result[i] = closest[0];
    result[i + 1] = closest[1];
    result[i + 2] = closest[2];
    result[i + 3] = 255; // 暫時不透明度都設為 255
  }

  return result;
}

export function buildCheckerboard(
  quantized: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if ((x + y) % 2 === 0) {
        output[idx] = quantized[idx];
        output[idx + 1] = quantized[idx + 1];
        output[idx + 2] = quantized[idx + 2];
        output[idx + 3] = 255;
      } else {
        // 奇數格: 嚴格填入 [255, 255, 255, 0] — 完全透明
        output[idx] = 255;
        output[idx + 1] = 255;
        output[idx + 2] = 255;
        output[idx + 3] = 0;
      }
    }
  }
  return output;
}

export function upscaleImage(
  pixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  targetSize: number
): [Uint8ClampedArray, number, number] {
  const aspectRatio = srcHeight / srcWidth;
  let newWidth = srcWidth;
  let newHeight = srcHeight;

  if (srcWidth < targetSize) {
    newWidth = targetSize;
    newHeight = Math.round(targetSize * aspectRatio);
  }
  if (newHeight < targetSize) {
    newHeight = targetSize;
    newWidth = Math.round(targetSize / aspectRatio);
  }

  if (newWidth === srcWidth && newHeight === srcHeight) {
    return [new Uint8ClampedArray(pixels), srcWidth, srcHeight];
  }

  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [new Uint8ClampedArray(pixels), srcWidth, srcHeight];

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcWidth;
  srcCanvas.height = srcHeight;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) return [new Uint8ClampedArray(pixels), srcWidth, srcHeight];

  const imageData = new ImageData(new Uint8ClampedArray(pixels), srcWidth, srcHeight);
  srcCtx.putImageData(imageData, 0, 0);

  ctx.drawImage(srcCanvas, 0, 0, newWidth, newHeight);

  const scaled = ctx.getImageData(0, 0, newWidth, newHeight);
  return [scaled.data, newWidth, newHeight];
}

export function resizeImage(
  pixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  scale: number
): [Uint8ClampedArray, number, number] {
  const dstWidth = Math.round(srcWidth * scale);
  const dstHeight = Math.round(srcHeight * scale);
  const buffer = new ArrayBuffer(dstWidth * dstHeight * 4);
  const result = new Uint8ClampedArray(buffer);

  for (let y = 0; y < dstHeight; y++) {
    for (let x = 0; x < dstWidth; x++) {
      const srcX = Math.min(Math.round(x / scale), srcWidth - 1);
      const srcY = Math.min(Math.round(y / scale), srcHeight - 1);
      const srcIdx = (srcY * srcWidth + srcX) * 4;
      const dstIdx = (y * dstWidth + x) * 4;

      result[dstIdx] = pixels[srcIdx];
      result[dstIdx + 1] = pixels[srcIdx + 1];
      result[dstIdx + 2] = pixels[srcIdx + 2];
      result[dstIdx + 3] = pixels[srcIdx + 3];
    }
  }

  return [result, dstWidth, dstHeight];
}

// ─── 主流程 ───

export interface XProcessResult {
  success: boolean;
  blob?: Blob;
  previewUrl?: string;
  width?: number;
  height?: number;
  sizeInMB?: string;
  error?: string;
  method?: 'analytical' | 'brute-force';
}

const MAX_SIZE = 1024 * 1024; // 1MB

export async function processImageForX(file: File): Promise<XProcessResult> {
  try {
    const imageData = await loadImageToPixels(file);
    const { pixels, width, height } = imageData;

    // 如果長或寬小於 1000px，放大圖片確保棋盤格效果
    const MIN_SIZE = 1000;
    const [upscaledPixels, upscaledWidth, upscaledHeight] =
      (width < MIN_SIZE || height < MIN_SIZE)
        ? upscaleImage(pixels, width, height, MIN_SIZE)
        : [new Uint8ClampedArray(pixels), width, height];

    let numColors = 32;
    let scale = 1.0;
    let currentWidth = upscaledWidth;
    let currentHeight = upscaledHeight;
    let currentPixels: Uint8ClampedArray = new Uint8ClampedArray(upscaledPixels);

    while (true) {
      // 1. Median-cut 量化到 numColors 色
      const palette = medianCutQuantization(currentPixels, numColors);

      // 2. 應用量化
      const quantized = applyQuantization(currentPixels, palette);

      // 3. 棋盤格化
      const checkerboard = buildCheckerboard(quantized, currentWidth, currentHeight);

      // 4. 使用 upng-js 編碼 PNG
      // ps=0: 不自動量化，讓 upng-js 使用原始像素
      const pngBuffer = UPNG.encode(
        [checkerboard.buffer as ArrayBuffer],
        currentWidth,
        currentHeight,
        0
      );

      const blob = new Blob([pngBuffer], { type: 'image/png' });

      if (blob.size <= MAX_SIZE) {
        const previewUrl = URL.createObjectURL(blob);
        return {
          success: true,
          blob,
          previewUrl,
          width: currentWidth,
          height: currentHeight,
          sizeInMB: (blob.size / (1024 * 1024)).toFixed(2),
          method: 'analytical',
        };
      }

      // 檔案太大，逐步減少顏色數
      if (numColors > 2) {
        numColors = Math.max(2, Math.floor(numColors / 2));
      } else {
        // 已經降到 2 色還是太大，縮小解析度
        scale -= 0.1;
        if (scale <= 0.3) {
          return {
            success: false,
            error: '無法將圖片壓縮至 1MB 以內，請嘗試上傳更小或更簡單的圖片',
          };
        }

        [currentPixels, currentWidth, currentHeight] = resizeImage(
          new Uint8ClampedArray(upscaledPixels),
          upscaledWidth,
          upscaledHeight,
          scale
        );
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '圖片處理失敗',
    };
  }
}
