import type { ImageDataTyped } from '@lib/types';

export function calculateMSE(imageA: ImageDataTyped, imageB: ImageDataTyped): number {
  const { width: wA, height: hA, pixels: pixelsA } = imageA;
  const { width: wB, height: hB, pixels: pixelsB } = imageB;

  if (wA !== wB || hA !== hB) {
    throw new Error('Images must have the same dimensions for MSE calculation');
  }

  let sumSquaredDiff = 0;
  const numPixels = wA * hA;

  for (let i = 0; i < pixelsA.length; i += 4) {
    const rDiff = pixelsA[i] - pixelsB[i];
    const gDiff = pixelsA[i + 1] - pixelsB[i + 1];
    const bDiff = pixelsA[i + 2] - pixelsB[i + 2];

    sumSquaredDiff += (rDiff * rDiff + gDiff * gDiff + bDiff * bDiff) / 3;
  }

  return sumSquaredDiff / numPixels;
}

export function calculatePSNR(imageA: ImageDataTyped, imageB: ImageDataTyped): number {
  try {
    const mse = calculateMSE(imageA, imageB);
    if (mse === 0) return Infinity;
    return 10 * Math.log10((255 * 255) / mse);
  } catch {
    return 0;
  }
}

export function calculateSSIM(imageA: ImageDataTyped, imageB: ImageDataTyped): number {
  const { width, height, pixels: pixelsA } = imageA;
  const { pixels: pixelsB } = imageB;

  if (width !== imageB.width || height !== imageB.height) {
    throw new Error('Images must have the same dimensions for SSIM calculation');
  }

  const windowSize = 8;
  const c1 = 0.01 * 255 * 0.01 * 255;
  const c2 = 0.03 * 255 * 0.03 * 255;

  let ssimSum = 0;
  let windowCount = 0;

  for (let y = 0; y < height - windowSize + 1; y += windowSize / 2) {
    for (let x = 0; x < width - windowSize + 1; x += windowSize / 2) {
      let sumA = 0, sumB = 0, sumASq = 0, sumBSq = 0, sumAB = 0;

      for (let wy = 0; wy < windowSize; wy++) {
        for (let wx = 0; wx < windowSize; wx++) {
          const px = x + wx;
          const py = y + wy;
          const idx = (py * width + px) * 4;

          const luminanceA = (pixelsA[idx] + pixelsA[idx + 1] + pixelsA[idx + 2]) / 3;
          const luminanceB = (pixelsB[idx] + pixelsB[idx + 1] + pixelsB[idx + 2]) / 3;

          sumA += luminanceA;
          sumB += luminanceB;
          sumASq += luminanceA * luminanceA;
          sumBSq += luminanceB * luminanceB;
          sumAB += luminanceA * luminanceB;
        }
      }

      const numPixels = windowSize * windowSize;
      const muA = sumA / numPixels;
      const muB = sumB / numPixels;
      const sigmaA2 = (sumASq / numPixels) - (muA * muA);
      const sigmaB2 = (sumBSq / numPixels) - (muB * muB);
      const sigmaAB = (sumAB / numPixels) - (muA * muB);

      const numerator = (2 * muA * muB + c1) * (2 * sigmaAB + c2);
      const denominator = (muA * muA + muB * muB + c1) * (sigmaA2 + sigmaB2 + c2);

      ssimSum += numerator / denominator;
      windowCount++;
    }
  }

  return windowCount > 0 ? ssimSum / windowCount : 0;
}
