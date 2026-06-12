import { getKernelFunction } from '@lib/interpolation';
import type { InterpolationKernel } from '@lib/types';

export interface HideImageResult {
  success: boolean;
  pixels?: Uint8ClampedArray;
  width?: number;
  height?: number;
  error?: string;
}

export interface DownsampledImage {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface AlgorithmMetrics {
  hiddenEnergy: number;
  carrierDiff: number;
  thumbnailMatchesBackground: boolean;
}

export function downsampleImage(
  srcPixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
  kernel: InterpolationKernel
): DownsampledImage {
  const dstPixels = new Uint8ClampedArray(dstWidth * dstHeight * 4);
  const kernelFn = getKernelFunction(kernel);
  const scaleX = srcWidth / dstWidth;
  const scaleY = srcHeight / dstHeight;
  const baseRadius = kernel === 'lanczos' ? 3 : 2;
  const sampleRadius = Math.ceil(baseRadius * Math.max(scaleX, scaleY));

  for (let dy = 0; dy < dstHeight; dy++) {
    for (let dx = 0; dx < dstWidth; dx++) {
      const srcX = dx * scaleX;
      const srcY = dy * scaleY;
      const startX = Math.floor(srcX - sampleRadius);
      const startY = Math.floor(srcY - sampleRadius);

      let r = 0, g = 0, b = 0;
      let totalWeight = 0;

      for (let sy = startY; sy <= startY + sampleRadius * 2; sy++) {
        for (let sx = startX; sx <= startX + sampleRadius * 2; sx++) {
          if (sx < 0 || sx >= srcWidth || sy < 0 || sy >= srcHeight) continue;

          const distX = Math.abs(sx - srcX);
          const distY = Math.abs(sy - srcY);
          const weight = kernelFn(distX) * kernelFn(distY);

          if (weight === 0) continue;

          const srcIdx = (sy * srcWidth + sx) * 4;
          r += srcPixels[srcIdx] * weight;
          g += srcPixels[srcIdx + 1] * weight;
          b += srcPixels[srcIdx + 2] * weight;
          totalWeight += weight;
        }
      }

      const dstIdx = (dy * dstWidth + dx) * 4;
      dstPixels[dstIdx] = totalWeight > 0 ? Math.round(r / totalWeight) : 0;
      dstPixels[dstIdx + 1] = totalWeight > 0 ? Math.round(g / totalWeight) : 0;
      dstPixels[dstIdx + 2] = totalWeight > 0 ? Math.round(b / totalWeight) : 0;
      dstPixels[dstIdx + 3] = 255;
    }
  }

  return { pixels: dstPixels, width: dstWidth, height: dstHeight };
}

function calculateMSE(pixels: Uint8ClampedArray, bgValue: number): number {
  let sumSqDiff = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const avg = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
    const diff = avg - bgValue;
    sumSqDiff += diff * diff;
    count++;
  }

  return count > 0 ? sumSqDiff / count : Infinity;
}

interface SecretPlacement {
  sW: number;
  sH: number;
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
}

function calculateSecretPlacement(
  carrierWidth: number,
  carrierHeight: number,
  secretWidth: number,
  secretHeight: number
): SecretPlacement {
  const secretAspect = secretWidth / secretHeight;
  const carrierAspect = carrierWidth / carrierHeight;

  let sW: number, sH: number, offsetX: number, offsetY: number;

  if (secretAspect > carrierAspect) {
    sW = carrierWidth;
    sH = carrierWidth / secretAspect;
    offsetX = 0;
    offsetY = (carrierHeight - sH) / 2;
  } else {
    sH = carrierHeight;
    sW = carrierHeight * secretAspect;
    offsetX = (carrierWidth - sW) / 2;
    offsetY = 0;
  }

  return {
    sW,
    sH,
    offsetX,
    offsetY,
    scaleX: sW / secretWidth,
    scaleY: sH / secretHeight,
  };
}

interface Sample {
  px: number;
  py: number;
  weight: number;
}

function collectSamples(
  srcX: number,
  srcY: number,
  carrierWidth: number,
  carrierHeight: number,
  sampleRadius: number,
  kernelFn: (x: number) => number
): Sample[] {
  const samples: Sample[] = [];
  const startX = Math.floor(srcX - sampleRadius);
  const startY = Math.floor(srcY - sampleRadius);

  for (let py = startY; py <= startY + sampleRadius * 2; py++) {
    for (let px = startX; px <= startX + sampleRadius * 2; px++) {
      if (px < 0 || px >= carrierWidth || py < 0 || py >= carrierHeight) continue;

      const distX = Math.abs(px - srcX);
      const distY = Math.abs(py - srcY);
      const w = kernelFn(distX) * kernelFn(distY);

      if (w > 0) {
        samples.push({ px, py, weight: w });
      }
    }
  }

  return samples;
}

function applyPixelAdjustments(
  outputPixels: Uint8ClampedArray,
  carrierWidth: number,
  samples: Sample[],
  adjustments: number[],
  direction: number,
  strength: number
): void {
  for (let s = 0; s < samples.length; s++) {
    const { px, py } = samples[s];
    const pIdx = (py * carrierWidth + px) * 4;
    const adj = adjustments[s] * direction * strength;

    outputPixels[pIdx] = Math.max(0, Math.min(255, outputPixels[pIdx] + adj));
    outputPixels[pIdx + 1] = Math.max(0, Math.min(255, outputPixels[pIdx + 1] + adj));
    outputPixels[pIdx + 2] = Math.max(0, Math.min(255, outputPixels[pIdx + 2] + adj));
  }
}

function solveLeastSquaresNormalEquations(
  kernelWeights: number[][],
  targetValues: number[],
  numSamples: number
): number[] {
  const m = kernelWeights.length;
  const n = numSamples;

  const ATA: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const ATb: number[] = new Array(m).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      ATb[j] += kernelWeights[j][i] * targetValues[i];
      for (let k = 0; k < m; k++) {
        ATA[j][k] += kernelWeights[j][i] * kernelWeights[k][i];
      }
    }
  }

  const solution = new Array(m).fill(0);
  const tolerance = 1e-10;
  const maxIterations = 50;

  for (let iter = 0; iter < maxIterations; iter++) {
    const r: number[] = [];
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < m; j++) {
        sum += kernelWeights[j][i] * solution[j];
      }
      r.push(targetValues[i] - sum);
    }

    const rNormSq = r.reduce((sum, val) => sum + val * val, 0);
    if (rNormSq < tolerance) break;

    const z: number[] = [];
    for (let j = 0; j < m; j++) {
      let sum = 0;
      for (let i = 0; i < n; i++) {
        sum += kernelWeights[j][i] * r[i];
      }
      sum += tolerance * solution[j];
      z.push(sum);
    }

    const zDotATAz = z.reduce((sum, zj, j) => {
      let rowSum = 0;
      for (let k = 0; k < m; k++) {
        rowSum += ATA[j][k] * z[k];
      }
      return sum + zj * rowSum;
    }, 0);

    const alpha = zDotATAz > tolerance ? rNormSq / zDotATAz : 0;

    for (let j = 0; j < m; j++) {
      solution[j] += alpha * z[j];
    }
  }

  return solution;
}

export function hideImageAnalytical(
  carrierPixels: Uint8ClampedArray,
  carrierWidth: number,
  carrierHeight: number,
  secretPixels: Uint8ClampedArray,
  secretWidth: number,
  secretHeight: number,
  backgroundColor: 'white' | 'black',
  targetWidth: number,
  targetHeight: number,
  kernel: InterpolationKernel = 'bicubic',
  strength: number = 0.8
): HideImageResult {
  try {
    const bgValue = backgroundColor === 'white' ? 255 : 0;
    const outputPixels = new Uint8ClampedArray(carrierPixels);

    const placement = calculateSecretPlacement(carrierWidth, carrierHeight, secretWidth, secretHeight);
    const { offsetX, offsetY, scaleX, scaleY } = placement;

    const carrierScaleX = carrierWidth / targetWidth;
    const carrierScaleY = carrierHeight / targetHeight;
    const baseRadius = kernel === 'lanczos' ? 3 : 2;
    const sampleRadius = Math.ceil(baseRadius * Math.max(carrierScaleX, carrierScaleY));
    const kernelFn = getKernelFunction(kernel);
    const blockSize = Math.ceil(sampleRadius * 2);

    for (let dy = 0; dy < targetHeight; dy++) {
      for (let dx = 0; dx < targetWidth; dx++) {
        const srcX = dx * carrierScaleX;
        const srcY = dy * carrierScaleY;

        const secX = (srcX - offsetX) / scaleX;
        const secY = (srcY - offsetY) / scaleY;

        if (secX < 0 || secX >= secretWidth || secY < 0 || secY >= secretHeight) continue;

        const sx = Math.floor(secX);
        const sy = Math.floor(secY);
        const sIdx = (sy * secretWidth + sx) * 4;

        const secretR = secretPixels[sIdx];
        const secretG = secretPixels[sIdx + 1];
        const secretB = secretPixels[sIdx + 2];
        const isLight = (secretR + secretG + secretB) / 3 > 128;

        const targetVal = isLight ? bgValue : 1 - bgValue;
        const direction = isLight ? 1 : -1;

        const samples = collectSamples(srcX, srcY, carrierWidth, carrierHeight, sampleRadius, kernelFn);
        if (samples.length === 0) continue;

        const n = blockSize * blockSize;
        const kernelWeights: number[][] = samples.map(() => new Array(n).fill(0));
        const targetValues: number[] = [];

        let blockIdx = 0;
        for (let by = 0; by < blockSize; by++) {
          for (let bx = 0; bx < blockSize; bx++) {
            for (let s = 0; s < samples.length; s++) {
              kernelWeights[s][blockIdx] = samples[s].weight;
            }
            targetValues.push((targetVal - 128) * strength);
            blockIdx++;
          }
        }

        const adjustments = solveLeastSquaresNormalEquations(kernelWeights, targetValues, n);
        applyPixelAdjustments(outputPixels, carrierWidth, samples, adjustments, direction, strength);
      }
    }

    return {
      success: true,
      pixels: outputPixels,
      width: carrierWidth,
      height: carrierHeight,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function hideImageBruteForce(
  carrierPixels: Uint8ClampedArray,
  carrierWidth: number,
  carrierHeight: number,
  secretPixels: Uint8ClampedArray,
  secretWidth: number,
  secretHeight: number,
  backgroundColor: 'white' | 'black',
  targetWidth: number,
  targetHeight: number,
  kernel: InterpolationKernel = 'bicubic'
): HideImageResult {
  try {
    const bgValue = backgroundColor === 'white' ? 255 : 0;
    const outputPixels = new Uint8ClampedArray(carrierPixels);

    const placement = calculateSecretPlacement(carrierWidth, carrierHeight, secretWidth, secretHeight);
    const { offsetX, offsetY, scaleX, scaleY } = placement;

    const carrierScaleX = carrierWidth / targetWidth;
    const carrierScaleY = carrierHeight / targetHeight;
    const baseRadius = kernel === 'lanczos' ? 3 : 2;
    const sampleRadius = Math.ceil(baseRadius * Math.max(carrierScaleX, carrierScaleY));
    const kernelFn = getKernelFunction(kernel);

    const searchValues = [0, 32, 64, 96, 128, 160, 192, 224, 255];

    for (let dy = 0; dy < targetHeight; dy++) {
      for (let dx = 0; dx < targetWidth; dx++) {
        const srcX = dx * carrierScaleX;
        const srcY = dy * carrierScaleY;

        const secX = (srcX - offsetX) / scaleX;
        const secY = (srcY - offsetY) / scaleY;

        if (secX < 0 || secX >= secretWidth || secY < 0 || secY >= secretHeight) continue;

        const sx = Math.floor(secX);
        const sy = Math.floor(secY);
        const sIdx = (sy * secretWidth + sx) * 4;

        const secretR = secretPixels[sIdx];
        const secretG = secretPixels[sIdx + 1];
        const secretB = secretPixels[sIdx + 2];
        const isLight = (secretR + secretG + secretB) / 3 > 128;

        const targetVal = isLight ? bgValue : 1 - bgValue;
        const direction = isLight ? 1 : -1;

        const samples = collectSamples(srcX, srcY, carrierWidth, carrierHeight, sampleRadius, kernelFn);
        if (samples.length === 0) continue;

        let bestValue = 128;
        let bestError = Infinity;

        for (const testValue of searchValues) {
          let weightedSum = 0;
          let totalWeight = 0;

          for (const sample of samples) {
            weightedSum += sample.weight * testValue;
            totalWeight += sample.weight;
          }

          const predicted = totalWeight > 0 ? weightedSum / totalWeight : 0;
          const error = Math.abs(predicted - targetVal);

          if (error < bestError) {
            bestError = error;
            bestValue = testValue;
          }
        }

        const delta = (bestValue - 128) * direction * 0.8;
        const adjustments = samples.map(() => delta);

        applyPixelAdjustments(outputPixels, carrierWidth, samples, adjustments, 1, 1);
      }
    }

    return {
      success: true,
      pixels: outputPixels,
      width: carrierWidth,
      height: carrierHeight,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export function compareAlgorithms(
  carrierPixels: Uint8ClampedArray,
  carrierWidth: number,
  carrierHeight: number,
  secretPixels: Uint8ClampedArray,
  secretWidth: number,
  secretHeight: number,
  backgroundColor: 'white' | 'black',
  targetWidth: number,
  targetHeight: number,
  kernel: InterpolationKernel
): {
  analytical: { result: HideImageResult; time: number; mse: number };
  bruteForce: { result: HideImageResult; time: number; mse: number };
} {
  const bgValue = backgroundColor === 'white' ? 255 : 0;

  const analyticalStart = performance.now();
  const analyticalResult = hideImageAnalytical(
    carrierPixels, carrierWidth, carrierHeight,
    secretPixels, secretWidth, secretHeight,
    backgroundColor, targetWidth, targetHeight, kernel, 0.8
  );
  const analyticalTime = performance.now() - analyticalStart;

  const analyticalThumb = analyticalResult.success && analyticalResult.pixels
    ? downsampleImage(analyticalResult.pixels, carrierWidth, carrierHeight, targetWidth, targetHeight, kernel)
    : null;

  const analyticalMse = analyticalThumb ? calculateMSE(analyticalThumb.pixels, bgValue) : Infinity;

  const bruteStart = performance.now();
  const bruteResult = hideImageBruteForce(
    carrierPixels, carrierWidth, carrierHeight,
    secretPixels, secretWidth, secretHeight,
    backgroundColor, targetWidth, targetHeight, kernel
  );
  const bruteTime = performance.now() - bruteStart;

  const bruteThumb = bruteResult.success && bruteResult.pixels
    ? downsampleImage(bruteResult.pixels, carrierWidth, carrierHeight, targetWidth, targetHeight, kernel)
    : null;

  const bruteMse = bruteThumb ? calculateMSE(bruteThumb.pixels, bgValue) : Infinity;

  return {
    analytical: { result: analyticalResult, time: analyticalTime, mse: analyticalMse },
    bruteForce: { result: bruteResult, time: bruteTime, mse: bruteMse },
  };
}

export function revealImage(
  carrierPixels: Uint8ClampedArray,
  processedPixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = 25
): Uint8ClampedArray {
  const diff = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < carrierPixels.length; i += 4) {
    const dr = Math.abs(processedPixels[i] - carrierPixels[i]);
    const dg = Math.abs(processedPixels[i + 1] - carrierPixels[i + 1]);
    const db = Math.abs(processedPixels[i + 2] - carrierPixels[i + 2]);

    const maxDiff = Math.max(dr, dg, db);
    const avgDiff = (dr + dg + db) / 3;

    if (maxDiff > threshold) {
      const factor = Math.min(255, avgDiff * 4);
      diff[i] = factor;
      diff[i + 1] = factor;
      diff[i + 2] = factor;
      diff[i + 3] = 255;
    } else {
      diff[i] = 0;
      diff[i + 1] = 0;
      diff[i + 2] = 0;
      diff[i + 3] = 255;
    }
  }

  return diff;
}

export const hideMessageAnalytical = hideImageAnalytical;
export const hideMessageBruteForce = hideImageBruteForce;
export const revealMessage = revealImage;