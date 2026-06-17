import { loadImageUrl, pixelsToDataUrl } from '@lib/imageUtils';
import {
  medianCutQuantization,
  applyQuantization,
  buildCheckerboard,
  resizeImage,
} from '@lib/xProcessor';
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
  time: number;
  method: 'analytical' | 'brute-force';
  steps: ProcessingStep[];
}

const SCALE_OPTIONS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
const COLOR_OPTIONS = [32, 16, 8, 4, 2];
const MAX_SIZE = 1024 * 1024;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function processImageAnalyticalWithProgress(
  imageUrl: string,
  onProgress: (progress: ProcessingProgress) => void,
  isPaused: { value: boolean },
  speedMultiplier: number
): Promise<ProcessingResult> {
  const imageData = await loadImageUrl(imageUrl);
  const { pixels, width, height } = imageData;
  const MIN_SIZE = 1000;

  let currentPixels = new Uint8ClampedArray(pixels.buffer as ArrayBuffer);
  let currentWidth = width;
  let currentHeight = height;
  const needUpscale = width < MIN_SIZE || height < MIN_SIZE;
  const steps: ProcessingStep[] = [];
  const startTime = Date.now();
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
      totalSteps: 7,
      stepName,
      numColors,
      scale,
      enumIndex: -1,
      enumResults: [],
      processedPixels,
      progress: (stepIndex / 7) * 100,
      ...additionalProgress,
    });
  };

  while (true) {
    while (isPaused.value) {
      await delay(100);
    }

    reportProgress('Load Image', null);
    await delay(1000 / speedMultiplier);
    stepIndex++;

    while (isPaused.value) {
      await delay(100);
    }

    if (needUpscale) {
      const aspectRatio = currentHeight / currentWidth;
      currentWidth = MIN_SIZE;
      currentHeight = Math.round(MIN_SIZE * aspectRatio);
      if (currentHeight < MIN_SIZE) {
        currentHeight = MIN_SIZE;
        currentWidth = Math.round(MIN_SIZE / aspectRatio);
      }

      const tempCanvas = new OffscreenCanvas(currentWidth, currentHeight);
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        const srcCanvas = new OffscreenCanvas(width, height);
        const srcCtx = srcCanvas.getContext('2d');
        if (srcCtx) {
          const imgData = new ImageData(new Uint8ClampedArray(pixels), width, height);
          srcCtx.putImageData(imgData, 0, 0);
          tempCtx.imageSmoothingEnabled = true;
          tempCtx.imageSmoothingQuality = 'high';
          tempCtx.drawImage(srcCanvas, 0, 0, currentWidth, currentHeight);
          const result = tempCtx.getImageData(0, 0, currentWidth, currentHeight);
          currentPixels = new Uint8ClampedArray(result.data.buffer as ArrayBuffer);
        }
      }
    }

    const upscaledDataUrl = pixelsToDataUrl(currentPixels, currentWidth, currentHeight);
    steps.push({
      stepName: 'Resize',
      stepIndex: stepIndex,
      processedPixels: upscaledDataUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Resize', upscaledDataUrl);
    await delay(1000 / speedMultiplier);
    stepIndex++;

    while (isPaused.value) {
      await delay(100);
    }

    const palette = medianCutQuantization(currentPixels, numColors);
    const quantized = applyQuantization(currentPixels, palette);
    const quantizedDataUrl = pixelsToDataUrl(quantized, currentWidth, currentHeight);
    steps.push({
      stepName: 'Quantize',
      stepIndex: stepIndex,
      processedPixels: quantizedDataUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Quantize', quantizedDataUrl);
    await delay(1000 / speedMultiplier);
    stepIndex++;

    while (isPaused.value) {
      await delay(100);
    }

    const checkerboard = buildCheckerboard(quantized, currentWidth, currentHeight);
    const checkerboardDataUrl = pixelsToDataUrl(checkerboard, currentWidth, currentHeight);
    steps.push({
      stepName: 'Checkerboard',
      stepIndex: stepIndex,
      processedPixels: checkerboardDataUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Checkerboard', checkerboardDataUrl);
    await delay(1000 / speedMultiplier);
    stepIndex++;

    while (isPaused.value) {
      await delay(100);
    }

    reportProgress('Encode PNG', checkerboardDataUrl);
    await delay(500 / speedMultiplier);
    stepIndex++;

    while (isPaused.value) {
      await delay(100);
    }

    const pngBuffer = UPNG.encode([checkerboard.buffer as ArrayBuffer], currentWidth, currentHeight, 0);
    const blob = new Blob([pngBuffer], { type: 'image/png' });

    steps.push({
      stepName: 'Size Check',
      stepIndex: stepIndex,
      processedPixels: checkerboardDataUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Size Check', checkerboardDataUrl);

    if (blob.size > MAX_SIZE) {
      if (numColors > 2) {
        numColors = Math.floor(numColors / 2);
        steps.push({
          stepName: `Colors: ${numColors}`,
          stepIndex: stepIndex,
          processedPixels: null,
          timestamp: Date.now() - startTime,
        });
        continue;
      } else {
        scale = Math.max(0.3, scale - 0.1);
        const resized = resizeImage(
          new Uint8ClampedArray(pixels.buffer as ArrayBuffer),
          width,
          height,
          scale
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        currentPixels = resized[0] as any;
        currentWidth = resized[1];
        currentHeight = resized[2];
        steps.push({
          stepName: `Scale: ${scale.toFixed(1)}`,
          stepIndex: stepIndex,
          processedPixels: null,
          timestamp: Date.now() - startTime,
        });
        continue;
      }
    }

    stepIndex++;
    await delay(1000 / speedMultiplier);

    const finalPreviewUrl = URL.createObjectURL(blob);
    steps.push({
      stepName: 'Complete',
      stepIndex: stepIndex,
      processedPixels: finalPreviewUrl,
      timestamp: Date.now() - startTime,
    });
    reportProgress('Complete', finalPreviewUrl);

    return {
      success: true,
      previewUrl: finalPreviewUrl,
      width: currentWidth,
      height: currentHeight,
      sizeInMB: (blob.size / (1024 * 1024)).toFixed(2),
      time: Date.now() - startTime,
      method: 'analytical',
      steps,
    };
  }
}

export async function processImageBruteForceWithProgress(
  imageUrl: string,
  onProgress: (progress: ProcessingProgress) => void,
  isPaused: { value: boolean },
  speedMultiplier: number
): Promise<ProcessingResult> {
  const imageData = await loadImageUrl(imageUrl);
  const { pixels, width, height } = imageData;
  const MIN_SIZE = 1000;

  let currentPixels = new Uint8ClampedArray(pixels.buffer as ArrayBuffer);
  let currentWidth = width;
  let currentHeight = height;
  const needUpscale = width < MIN_SIZE || height < MIN_SIZE;
  const steps: ProcessingStep[] = [];
  const startTime = Date.now();
  let stepIndex = 0;
  const enumResults = Array(40).fill('pending') as ('pending' | 'pass' | 'fail')[];

  const reportProgress = (
    stepName: string,
    processedPixels: string | null = null,
    additionalProgress: Partial<ProcessingProgress> = {}
  ) => {
    onProgress({
      method: 'brute-force',
      currentStep: stepIndex,
      totalSteps: 6,
      stepName,
      numColors: COLOR_OPTIONS[0],
      scale: SCALE_OPTIONS[0],
      enumIndex: -1,
      enumResults: [...enumResults],
      processedPixels,
      progress: (stepIndex / 6) * 100,
      ...additionalProgress,
    });
  };

  while (isPaused.value) {
    await delay(100);
  }

  reportProgress('Load Image', null);
  await delay(1000 / speedMultiplier);
  stepIndex++;

  while (isPaused.value) {
    await delay(100);
  }

  if (needUpscale) {
    const aspectRatio = currentHeight / currentWidth;
    currentWidth = MIN_SIZE;
    currentHeight = Math.round(MIN_SIZE * aspectRatio);
    if (currentHeight < MIN_SIZE) {
      currentHeight = MIN_SIZE;
      currentWidth = Math.round(MIN_SIZE / aspectRatio);
    }

    const tempCanvas = new OffscreenCanvas(currentWidth, currentHeight);
    const tempCtx = tempCanvas.getContext('2d');
    if (tempCtx) {
      const srcCanvas = new OffscreenCanvas(width, height);
      const srcCtx = srcCanvas.getContext('2d');
      if (srcCtx) {
        const imgData = new ImageData(new Uint8ClampedArray(pixels), width, height);
        srcCtx.putImageData(imgData, 0, 0);
        tempCtx.imageSmoothingEnabled = true;
        tempCtx.imageSmoothingQuality = 'high';
        tempCtx.drawImage(srcCanvas, 0, 0, currentWidth, currentHeight);
        const result = tempCtx.getImageData(0, 0, currentWidth, currentHeight);
        currentPixels = new Uint8ClampedArray(result.data.buffer as ArrayBuffer);
      }
    }
  }

  const upscaledDataUrl = pixelsToDataUrl(currentPixels, currentWidth, currentHeight);
  steps.push({
    stepName: 'Resize',
    stepIndex: stepIndex,
    processedPixels: upscaledDataUrl,
    timestamp: Date.now() - startTime,
  });
  reportProgress('Resize', upscaledDataUrl);
  await delay(1000 / speedMultiplier);
  stepIndex++;

  while (isPaused.value) {
    await delay(100);
  }

  reportProgress('Enum Combinations', upscaledDataUrl);
  await delay(500 / speedMultiplier);
  stepIndex++;

  while (isPaused.value) {
    await delay(100);
  }

  reportProgress('Try Combinations', upscaledDataUrl);

  let foundPreviewUrl: string | null = null;
  let foundWidth = currentWidth;
  let foundHeight = currentHeight;
  let foundSizeMB = '0';

  for (let i = 0; i < 40; i++) {
    while (isPaused.value) {
      await delay(100);
    }

    const scale = SCALE_OPTIONS[Math.floor(i / 5)];
    const numColors = COLOR_OPTIONS[i % 5];

    enumResults[i] = 'fail';
    reportProgress('Try Combinations', null, {
      enumIndex: i,
      numColors,
      scale,
      enumResults: [...enumResults],
    });

    let workPixels = currentPixels;
    let workWidth = currentWidth;
    let workHeight = currentHeight;

    if (scale < 1.0) {
      const resized = resizeImage(
        new Uint8ClampedArray(currentPixels.buffer as ArrayBuffer),
        width,
        height,
        scale
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      workPixels = resized[0] as any;
      workWidth = resized[1];
      workHeight = resized[2];
    }

    const palette = medianCutQuantization(workPixels, numColors);
    const quantized = applyQuantization(workPixels, palette);
    const checkerboard = buildCheckerboard(quantized, workWidth, workHeight);

    const pngBuffer = UPNG.encode([checkerboard.buffer as ArrayBuffer], workWidth, workHeight, 0);
    const blob = new Blob([pngBuffer], { type: 'image/png' });

    if (blob.size <= MAX_SIZE) {
      enumResults[i] = 'pass';
      foundPreviewUrl = URL.createObjectURL(blob);
      foundWidth = workWidth;
      foundHeight = workHeight;
      foundSizeMB = (blob.size / (1024 * 1024)).toFixed(2);

      reportProgress('Select Result', foundPreviewUrl, {
        enumIndex: i,
        numColors,
        scale,
        enumResults: [...enumResults],
      });
      break;
    }

    await delay(50 / speedMultiplier);
  }

  stepIndex++;
  await delay(1000 / speedMultiplier);

  steps.push({
    stepName: 'Complete',
    stepIndex: stepIndex,
    processedPixels: foundPreviewUrl,
    timestamp: Date.now() - startTime,
  });
  reportProgress('Complete', foundPreviewUrl, { enumIndex: 40 });

  return {
    success: true,
    previewUrl: foundPreviewUrl,
    width: foundWidth,
    height: foundHeight,
    sizeInMB: foundSizeMB,
    time: Date.now() - startTime,
    method: 'brute-force',
    steps,
  };
}