import type { InterpolationKernel } from '@lib/types';

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
