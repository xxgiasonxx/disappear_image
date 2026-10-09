import { loadImageUrl, pixelsToDataUrl } from '@lib/imageUtils';
import {
  medianCutQuantization,
  applyQuantization,
  buildCheckerboard,
  upscaleImage,
  resizeImage,
} from '@lib/xProcessor';
import {
  SCALE_OPTIONS,
  COLOR_OPTIONS,
  getCandidatePriority,
} from '@lib/bruteForceXProcessor';
import UPNG from 'upng-js';

export interface ProcessingStep {
  stepName: string;
  stepIndex: number;
  processedPixels: string | null;
  timestamp: number;
}

export interface ProcessingProgress {
  method: 'analytical' | 'brute-force';
  currentStep: number;
  totalSteps: number;
  stepName: string;
  numColors: number;
  scale: number;
  enumIndex: number;
  enumResults: ('pending' | 'pass' | 'fail')[];
  processedPixels: string | null;
  progress: number;
}

export interface ProcessingResult {
  success: boolean;
  previewUrl: string | null;
  width: number;
  height: number;
  sizeInMB: string;
  time: number; // 實際運算時間（ms），不含動畫延遲與暫停
  method: 'analytical' | 'brute-force';
  steps: ProcessingStep[];
}

const MIN_SIZE = 1000;
const MAX_SIZE = 1024 * 1024;
const TOTAL_COMBINATIONS = SCALE_OPTIONS.length * COLOR_OPTIONS.length;
// 對應 AlgorithmDemo 的 BRUTE_FORCE_STEPS：['載入圖片', '尺寸調整', '枚舉組合', '嘗試組合', '選擇結果', '完成']
const BRUTE_FORCE_SELECT_STEP = 4;
const BRUTE_FORCE_COMPLETE_STEP = 5;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Processing aborted', 'AbortError');
  }
}

async function waitIfPaused(isPaused: { value: boolean }, signal?: AbortSignal): Promise<void> {
  while (isPaused.value) {
    throwIfAborted(signal);
    await delay(100);
  }
  throwIfAborted(signal);
}

// 只累計實際運算的時間，讓兩種方法的處理時間可以公平比較
function createComputeTimer() {
  let elapsed = 0;
  return {
    run<T>(fn: () => T): T {
      const start = performance.now();
      try {
        return fn();
      } finally {
        elapsed += performance.now() - start;
      }
    },
    get ms(): number {
      return Math.round(elapsed);
    },
  };
}

function upscaleIfNeeded(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): [Uint8ClampedArray, number, number] {
  return (width < MIN_SIZE || height < MIN_SIZE)
    ? upscaleImage(pixels, width, height, MIN_SIZE)
    : [new Uint8ClampedArray(pixels), width, height];
}

function encodeCheckerboardPng(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  numColors: number
): Blob {
  const palette = medianCutQuantization(pixels, numColors);
  const quantized = applyQuantization(pixels, palette);
  const checkerboard = buildCheckerboard(quantized, width, height);
  const pngBuffer = UPNG.encode([checkerboard.buffer as ArrayBuffer], width, height, 0);
  return new Blob([pngBuffer], { type: 'image/png' });
}

export async function processImageAnalyticalWithProgress(
  imageUrl: string,
  onProgress: (progress: ProcessingProgress) => void,
  isPaused: { value: boolean },
  speed: { value: number },
  signal?: AbortSignal
): Promise<ProcessingResult> {
  const { pixels, width, height } = await loadImageUrl(imageUrl);
  const TOTAL_STEPS = 7;

  const steps: ProcessingStep[] = [];
  const startTime = Date.now();
  const timer = createComputeTimer();
  let numColors = 32;
  let scale = 1.0;
  let stepIndex = 0;

  const reportProgress = (
    stepName: string,
    processedPixels: string | null = null,
    additionalProgress: Partial<ProcessingProgress> = {}
  ) => {
    onProgress({
      method: 'analytical',
      currentStep: stepIndex,
      totalSteps: TOTAL_STEPS,
      stepName,
      numColors,
      scale,
      enumIndex: -1,
      enumResults: [],
      processedPixels,
      progress: (stepIndex / TOTAL_STEPS) * 100,
      ...additionalProgress,
    });
  };

  await waitIfPaused(isPaused, signal);
  reportProgress('Load Image', null);
  await delay(1000 / speed.value);

  // 只放大一次；之後縮小解析度都以放大後的圖為基準，與 processImageForX 一致
  const [basePixels, baseWidth, baseHeight] = timer.run(() => upscaleIfNeeded(pixels, width, height));

  let currentPixels: Uint8ClampedArray = basePixels;
  let currentWidth = baseWidth;
  let currentHeight = baseHeight;

  while (true) {
    // 每輪重試都從「尺寸調整」開始
    stepIndex = 1;
    await waitIfPaused(isPaused, signal);

    const resizedDataUrl = pixelsToDataUrl(currentPixels, currentWidth, currentHeight);
    steps.push({
      stepName: 'Resize',
      stepIndex: stepIndex,
      processedPixels: resizedDataUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Resize', resizedDataUrl);
    await delay(1000 / speed.value);
    stepIndex++;

    await waitIfPaused(isPaused, signal);

    const quantized = timer.run(() => {
      const palette = medianCutQuantization(currentPixels, numColors);
      return applyQuantization(currentPixels, palette);
    });
    const quantizedDataUrl = pixelsToDataUrl(quantized, currentWidth, currentHeight);
    steps.push({
      stepName: 'Quantize',
      stepIndex: stepIndex,
      processedPixels: quantizedDataUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Quantize', quantizedDataUrl);
    await delay(1000 / speed.value);
    stepIndex++;

    await waitIfPaused(isPaused, signal);

    const checkerboard = timer.run(() => buildCheckerboard(quantized, currentWidth, currentHeight));
    const checkerboardDataUrl = pixelsToDataUrl(checkerboard, currentWidth, currentHeight);
    steps.push({
      stepName: 'Checkerboard',
      stepIndex: stepIndex,
      processedPixels: checkerboardDataUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Checkerboard', checkerboardDataUrl);
    await delay(1000 / speed.value);
    stepIndex++;

    await waitIfPaused(isPaused, signal);

    reportProgress('Encode PNG', checkerboardDataUrl);
    await delay(500 / speed.value);
    stepIndex++;

    await waitIfPaused(isPaused, signal);

    const blob = timer.run(() => {
      const pngBuffer = UPNG.encode([checkerboard.buffer as ArrayBuffer], currentWidth, currentHeight, 0);
      return new Blob([pngBuffer], { type: 'image/png' });
    });

    steps.push({
      stepName: 'Size Check',
      stepIndex: stepIndex,
      processedPixels: checkerboardDataUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Size Check', checkerboardDataUrl);

    if (blob.size > MAX_SIZE) {
      if (numColors > 2) {
        numColors = Math.max(2, Math.floor(numColors / 2));
        steps.push({
          stepName: `Colors: ${numColors}`,
          stepIndex: stepIndex,
          processedPixels: null,
          timestamp: Date.now() - startTime,
        });
        continue;
      }

      scale -= 0.1;
      if (scale <= 0.3) {
        reportProgress('Failed', null);
        return {
          success: false,
          previewUrl: null,
          width: currentWidth,
          height: currentHeight,
          sizeInMB: (blob.size / (1024 * 1024)).toFixed(2),
          time: timer.ms,
          method: 'analytical',
          steps,
        };
      }

      [currentPixels, currentWidth, currentHeight] = timer.run(() =>
        resizeImage(basePixels, baseWidth, baseHeight, scale)
      );
      steps.push({
        stepName: `Scale: ${scale.toFixed(1)}`,
        stepIndex: stepIndex,
        processedPixels: null,
        timestamp: Date.now() - startTime,
      });
      continue;
    }

    stepIndex++;
    await delay(1000 / speed.value);
    throwIfAborted(signal);

    const finalPreviewUrl = URL.createObjectURL(blob);
    steps.push({
      stepName: 'Complete',
      stepIndex: stepIndex,
      processedPixels: finalPreviewUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Complete', finalPreviewUrl, { progress: 100 });

    return {
      success: true,
      previewUrl: finalPreviewUrl,
      width: currentWidth,
      height: currentHeight,
      sizeInMB: (blob.size / (1024 * 1024)).toFixed(2),
      time: timer.ms,
      method: 'analytical',
      steps,
    };
  }
}

interface BruteForceCandidate {
  index: number;
  priority: number;
  blob: Blob;
  width: number;
  height: number;
}

// 與 bruteForceXProcess 相同：窮舉全部組合，保留 ≤ 1MB 的候選，再依優先順序挑選
export async function processImageBruteForceWithProgress(
  imageUrl: string,
  onProgress: (progress: ProcessingProgress) => void,
  isPaused: { value: boolean },
  speed: { value: number },
  signal?: AbortSignal
): Promise<ProcessingResult> {
  const { pixels, width, height } = await loadImageUrl(imageUrl);
  const TOTAL_STEPS = 6;

  const steps: ProcessingStep[] = [];
  const startTime = Date.now();
  const timer = createComputeTimer();
  let stepIndex = 0;
  const enumResults = Array(TOTAL_COMBINATIONS).fill('pending') as ('pending' | 'pass' | 'fail')[];

  const reportProgress = (
    stepName: string,
    processedPixels: string | null = null,
    additionalProgress: Partial<ProcessingProgress> = {}
  ) => {
    onProgress({
      method: 'brute-force',
      currentStep: stepIndex,
      totalSteps: TOTAL_STEPS,
      stepName,
      numColors: COLOR_OPTIONS[0],
      scale: SCALE_OPTIONS[0],
      enumIndex: -1,
      enumResults: [...enumResults],
      processedPixels,
      progress: (stepIndex / TOTAL_STEPS) * 100,
      ...additionalProgress,
    });
  };

  await waitIfPaused(isPaused, signal);
  reportProgress('Load Image', null);
  await delay(1000 / speed.value);
  stepIndex++;

  await waitIfPaused(isPaused, signal);

  const [basePixels, baseWidth, baseHeight] = timer.run(() => upscaleIfNeeded(pixels, width, height));
  const upscaledDataUrl = pixelsToDataUrl(basePixels, baseWidth, baseHeight);
  steps.push({
    stepName: 'Resize',
    stepIndex: stepIndex,
    processedPixels: upscaledDataUrl,
    timestamp: Date.now() - startTime,
  });
  reportProgress('Resize', upscaledDataUrl);
  await delay(1000 / speed.value);
  stepIndex++;

  await waitIfPaused(isPaused, signal);

  reportProgress('Enum Combinations', upscaledDataUrl);
  await delay(500 / speed.value);
  stepIndex++;

  await waitIfPaused(isPaused, signal);

  reportProgress('Try Combinations', upscaledDataUrl);

  const candidates: BruteForceCandidate[] = [];

  for (let i = 0; i < TOTAL_COMBINATIONS; i++) {
    await waitIfPaused(isPaused, signal);

    const scale = SCALE_OPTIONS[Math.floor(i / COLOR_OPTIONS.length)];
    const numColors = COLOR_OPTIONS[i % COLOR_OPTIONS.length];

    reportProgress('Try Combinations', null, { enumIndex: i, numColors, scale });

    const { blob, workWidth, workHeight } = timer.run(() => {
      const [workPixels, workWidth, workHeight] = scale === 1.0
        ? [basePixels, baseWidth, baseHeight]
        : resizeImage(basePixels, baseWidth, baseHeight, scale);
      return {
        blob: encodeCheckerboardPng(workPixels, workWidth, workHeight, numColors),
        workWidth,
        workHeight,
      };
    });

    if (blob.size <= MAX_SIZE) {
      enumResults[i] = 'pass';
      candidates.push({
        index: i,
        priority: getCandidatePriority(scale, numColors),
        blob,
        width: workWidth,
        height: workHeight,
      });
    } else {
      enumResults[i] = 'fail';
    }

    reportProgress('Try Combinations', null, { enumIndex: i, numColors, scale });
    await delay(50 / speed.value);
  }

  // 排序是穩定的，同優先度時保留枚舉順序，與 bruteForceXProcess 一致
  const selected = [...candidates].sort((a, b) => a.priority - b.priority)[0];

  stepIndex = BRUTE_FORCE_SELECT_STEP;
  await waitIfPaused(isPaused, signal);

  if (!selected) {
    reportProgress('Failed', null, { progress: 100 });
    return {
      success: false,
      previewUrl: null,
      width: baseWidth,
      height: baseHeight,
      sizeInMB: '0',
      time: timer.ms,
      method: 'brute-force',
      steps,
    };
  }

  const selectedCombination = {
    enumIndex: selected.index,
    numColors: COLOR_OPTIONS[selected.index % COLOR_OPTIONS.length],
    scale: SCALE_OPTIONS[Math.floor(selected.index / COLOR_OPTIONS.length)],
  };
  const previewUrl = URL.createObjectURL(selected.blob);
  reportProgress('Select Result', previewUrl, selectedCombination);
  await delay(1000 / speed.value);
  throwIfAborted(signal);

  stepIndex = BRUTE_FORCE_COMPLETE_STEP;
  steps.push({
    stepName: 'Complete',
    stepIndex: stepIndex,
    processedPixels: previewUrl,
    timestamp: Date.now() - startTime,
  });
  reportProgress('Complete', previewUrl, { ...selectedCombination, progress: 100 });

  return {
    success: true,
    previewUrl,
    width: selected.width,
    height: selected.height,
    sizeInMB: (selected.blob.size / (1024 * 1024)).toFixed(2),
    time: timer.ms,
    method: 'brute-force',
    steps,
  };
}
