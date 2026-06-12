import type { InterpolationKernel, PlatformConfig } from '@lib/types';

export function calculateTargetSize(
  srcWidth: number,
  srcHeight: number,
  config: PlatformConfig
): { width: number; height: number } {
  if (config.strategy === 'bounding-box') {
    const scale = Math.min(
      (config.maxWidth || Infinity) / srcWidth,
      (config.maxHeight || Infinity) / srcHeight
    );
    if (scale >= 1) return { width: srcWidth, height: srcHeight };
    return {
      width: Math.round(srcWidth * scale),
      height: Math.round(srcHeight * scale),
    };
  } else {
    const longEdge = Math.max(srcWidth, srcHeight);
    const maxEdge = config.maxEdge || Infinity;
    if (longEdge <= maxEdge) return { width: srcWidth, height: srcHeight };
    const scale = maxEdge / longEdge;
    return {
      width: Math.round(srcWidth * scale),
      height: Math.round(srcHeight * scale),
    };
  }
}

export function bilinearKernel(x: number): number {
  const absX = Math.abs(x);
  if (absX >= 1) return 0;
  return 1 - absX;
}

export function bicubicKernel(x: number, a: number = -0.5): number {
  const absX = Math.abs(x);
  if (absX >= 2) return 0;
  if (absX < 1) {
    return (a + 2) * absX * absX * absX - (a + 3) * absX * absX + 1;
  }
  return a * absX * absX * absX - 5 * a * absX * absX + 8 * a * absX - 4 * a;
}

export function lanczosKernel(x: number, a: number = 3): number {
  if (x === 0) return 1;
  const absX = Math.abs(x);
  if (absX >= a) return 0;
  const piX = Math.PI * absX;
  return (a * Math.sin(piX) * Math.sin(piX / a)) / (piX * piX);
}

export function getKernelFunction(kernel: InterpolationKernel): (x: number) => number {
  switch (kernel) {
    case 'bilinear':
      return bilinearKernel;
    case 'bicubic':
      return bicubicKernel;
    case 'lanczos':
      return lanczosKernel;
    default:
      return bilinearKernel;
  }
}

export function getKernelRadius(kernel: InterpolationKernel): number {
  switch (kernel) {
    case 'bilinear':
      return 1;
    case 'bicubic':
      return 2;
    case 'lanczos':
      return 3;
    default:
      return 1;
  }
}

export function getScaleMatrix(
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number
): Float32Array {
  const scaleX = srcWidth / dstWidth;
  const scaleY = srcHeight / dstHeight;
  const matrix = new Float32Array(4);
  matrix[0] = scaleX;
  matrix[1] = scaleY;
  matrix[2] = 1 / scaleX;
  matrix[3] = 1 / scaleY;
  return matrix;
}

export function getKernelWeights(
  _srcPos: number,
  dstPos: number,
  scale: number,
  kernel: InterpolationKernel
): { index: number; weight: number }[] {
  const kernelFn = getKernelFunction(kernel);
  const weights: { index: number; weight: number }[] = [];
  const radius = getKernelRadius(kernel);
  const center = dstPos * scale;
  const start = Math.floor(center - radius);
  const end = Math.ceil(center + radius);

  for (let i = start; i <= end; i++) {
    const distance = Math.abs(i - center) / scale;
    const weight = kernelFn(distance);
    if (weight !== 0) {
      weights.push({ index: i, weight });
    }
  }

  return weights;
}

export function downsampleImage(
  srcPixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
  kernel: InterpolationKernel
): { width: number; height: number; pixels: Uint8ClampedArray } {
  const kernelFn = getKernelFunction(kernel);
  const radius = getKernelRadius(kernel);
  const scaleX = srcWidth / dstWidth;
  const scaleY = srcHeight / dstHeight;
  const dstPixels = new Uint8ClampedArray(dstWidth * dstHeight * 4);

  for (let dy = 0; dy < dstHeight; dy++) {
    for (let dx = 0; dx < dstWidth; dx++) {
      const srcX = dx * scaleX;
      const srcY = dy * scaleY;

      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      let totalWeight = 0;

      const startX = Math.floor(srcX - radius * scaleX);
      const endX = Math.ceil(srcX + radius * scaleX);
      const startY = Math.floor(srcY - radius * scaleY);
      const endY = Math.ceil(srcY + radius * scaleY);

      for (let sy = startY; sy <= endY; sy++) {
        for (let sx = startX; sx <= endX; sx++) {
          if (sx < 0 || sx >= srcWidth || sy < 0 || sy >= srcHeight) continue;

          const distX = (sx - srcX) / scaleX;
          const distY = (sy - srcY) / scaleY;
          const weight = kernelFn(distX) * kernelFn(distY);

          if (weight === 0) continue;

          const srcIdx = (sy * srcWidth + sx) * 4;
          r += srcPixels[srcIdx] * weight;
          g += srcPixels[srcIdx + 1] * weight;
          b += srcPixels[srcIdx + 2] * weight;
          a += srcPixels[srcIdx + 3] * weight;
          totalWeight += weight;
        }
      }

      const dstIdx = (dy * dstWidth + dx) * 4;
      if (totalWeight > 0) {
        dstPixels[dstIdx] = Math.round(r / totalWeight);
        dstPixels[dstIdx + 1] = Math.round(g / totalWeight);
        dstPixels[dstIdx + 2] = Math.round(b / totalWeight);
        dstPixels[dstIdx + 3] = Math.round(a / totalWeight);
      } else {
        dstPixels[dstIdx] = 0;
        dstPixels[dstIdx + 1] = 0;
        dstPixels[dstIdx + 2] = 0;
        dstPixels[dstIdx + 3] = 255;
      }
    }
  }

  return { width: dstWidth, height: dstHeight, pixels: dstPixels };
}

export function bilinearInterpolate(
  srcPixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  x: number,
  y: number
): number[] {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, srcWidth - 1);
  const y1 = Math.min(y0 + 1, srcHeight - 1);

  const fx = x - x0;
  const fy = y - y0;

  const colors = [];
  for (let c = 0; c < 4; c++) {
    const c00 = srcPixels[((y0 * srcWidth) + x0) * 4 + c];
    const c10 = srcPixels[((y0 * srcWidth) + x1) * 4 + c];
    const c01 = srcPixels[((y1 * srcWidth) + x0) * 4 + c];
    const c11 = srcPixels[((y1 * srcWidth) + x1) * 4 + c];

    const top = c00 * (1 - fx) + c10 * fx;
    const bottom = c01 * (1 - fx) + c11 * fx;
    colors.push(Math.round(top * (1 - fy) + bottom * fy));
  }
  return colors;
}
