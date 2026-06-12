import { hideImageAnalytical } from '@lib/analytical';
import { hideImageBruteForce } from '@lib/bruteForce';
import { downsampleImage } from '@lib/interpolation';
import type { ImageDataTyped, StegoConfig, AlgorithmType } from '@lib/types';

interface WorkerRequest {
  id: string;
  algorithm: AlgorithmType;
  coverImage: ImageDataTyped;
  secretImage: ImageDataTyped;
  config: StegoConfig;
}

interface WorkerProgress {
  type: 'progress';
  id: string;
  tileIndex: number;
  totalTiles: number;
  progress: number;
}

interface WorkerResult {
  type: 'result';
  id: string;
  result: ImageDataTyped;
  elapsedTime: number;
}

interface WorkerError {
  type: 'error';
  id: string;
  error: string;
}


function postProgress(id: string, tileIndex: number, totalTiles: number) {
  const progress = Math.round((tileIndex / totalTiles) * 100);
  self.postMessage({
    type: 'progress',
    id,
    tileIndex,
    totalTiles,
    progress,
  } as WorkerProgress);
}

function postResult(id: string, result: ImageDataTyped, elapsedTime: number) {
  self.postMessage({
    type: 'result',
    id,
    result,
    elapsedTime,
  } as WorkerResult);
}

function postError(id: string, error: string) {
  self.postMessage({
    type: 'error',
    id,
    error,
  } as WorkerError);
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { id, algorithm, coverImage, secretImage, config } = event.data;

  try {
    const startTime = performance.now();

    if (algorithm === 'analytical') {
      const numXTiles = Math.ceil(coverImage.width / (config.tileSize - config.overlap));
      const numYTiles = Math.ceil(coverImage.height / (config.tileSize - config.overlap));
      const totalTiles = numXTiles * numYTiles;

      const result = hideImageAnalytical(coverImage, secretImage, config);

      // Simulate progress reporting (since hideImageAnalytical doesn't support callbacks)
      for (let i = 0; i < totalTiles; i++) {
        postProgress(id, i + 1, totalTiles);
      }

      const elapsedTime = performance.now() - startTime;
      postResult(id, result, elapsedTime);
    } else if (algorithm === 'brute-force') {
      const result = hideImageBruteForce(coverImage, secretImage, config);
      const elapsedTime = performance.now() - startTime;
      postResult(id, result, elapsedTime);
    } else {
      postError(id, `Unknown algorithm: ${algorithm}`);
    }
  } catch (error) {
    postError(id, error instanceof Error ? error.message : 'Unknown error');
  }
};

// Also expose downsample for direct use
export { downsampleImage };
