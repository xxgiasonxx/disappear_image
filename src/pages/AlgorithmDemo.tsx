import { useState, useCallback } from 'react';
import type { ImageDataTyped, StegoConfig, AlgorithmType } from '@lib/types';
import { generateCoverImage, generateSecretImage } from '@lib/exampleGenerator';

interface AlgorithmResult {
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  elapsedTime: number;
  error: string | null;
  result: ImageDataTyped | null;
}

const DEFAULT_STEGO_CONFIG: StegoConfig = {
  interpolationKernel: 'bilinear',
  targetWidth: 100,
  targetHeight: 100,
  strength: 0.8,
  tileSize: 64,
  overlap: 8,
};

export function AlgorithmDemo() {
  const [coverImage] = useState<ImageDataTyped>(() => generateCoverImage(200, 200));
  const [secretImage] = useState<ImageDataTyped>(() => generateSecretImage(50, 50));

  const algo1: AlgorithmType = 'brute-force';
  const algo2: AlgorithmType = 'analytical';

  const [result1, setResult1] = useState<AlgorithmResult>({
    status: 'idle',
    progress: 0,
    elapsedTime: 0,
    error: null,
    result: null,
  });

  const [result2, setResult2] = useState<AlgorithmResult>({
    status: 'idle',
    progress: 0,
    elapsedTime: 0,
    error: null,
    result: null,
  });

  const processImage = useCallback(
    async (algorithm: AlgorithmType, config: StegoConfig): Promise<AlgorithmResult> => {
      return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('@workers/imageProcessor.worker.ts', import.meta.url));

        worker.onmessage = (event) => {
          const data = event.data;
          if (data.type === 'progress') {
            // Progress update
          } else if (data.type === 'result') {
            resolve({
              status: 'done',
              progress: 100,
              elapsedTime: data.elapsedTime,
              error: null,
              result: data.result,
            });
            worker.terminate();
          } else if (data.type === 'error') {
            reject(new Error(data.error));
          }
        };

        worker.onerror = (error) => {
          reject(new Error(error.message || 'Worker error'));
        };

        worker.postMessage({
          id: Math.random().toString(36).substring(7),
          algorithm,
          coverImage,
          secretImage,
          config,
        });
      });
    },
    [coverImage, secretImage]
  );

  const handleRun = useCallback(async () => {
    setResult1({ status: 'processing', progress: 0, elapsedTime: 0, error: null, result: null });
    setResult2({ status: 'processing', progress: 0, elapsedTime: 0, error: null, result: null });

    try {
      const [res1, res2] = await Promise.all([
        processImage(algo1, DEFAULT_STEGO_CONFIG),
        processImage(algo2, DEFAULT_STEGO_CONFIG),
      ]);

      setResult1(res1);
      setResult2(res2);
    } catch (error) {
      console.error('Error running algorithms:', error);
    }
  }, [algo1, algo2, processImage]);

  // Convert ImageDataTyped to data URL
  const toDataUrl = (image: ImageDataTyped | null): string => {
    if (!image) return '';
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imageData = new ImageData(new Uint8ClampedArray(image.pixels), image.width, image.height);
      ctx.putImageData(imageData, 0, 0);
    }
    return canvas.toDataURL();
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Algorithm Demo</h1>
      <div className="mb-6">
        <button
          onClick={handleRun}
          disabled={result1.status === 'processing' || result2.status === 'processing'}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {result1.status === 'processing' || result2.status === 'processing'
            ? 'Processing...'
            : 'Run Algorithms'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Algorithm 1 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">
            {algo1 === 'brute-force' ? 'Brute Force' : 'Analytical'}
          </h2>
          {result1.status === 'processing' && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                <div
                  className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${result1.progress}%` }}
                ></div>
              </div>
            </div>
          )}
          {result1.result && (
            <div className="space-y-2">
              <img
                src={toDataUrl(result1.result)}
                alt={`${algo1} result`}
                className="w-full rounded-lg"
              />
              <p className="text-sm text-gray-600">Elapsed time: {result1.elapsedTime.toFixed(2)}ms</p>
            </div>
          )}
        </div>

        {/* Algorithm 2 */}
        <div className="border rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">
            {algo2 === 'analytical' ? 'Analytical' : 'Brute Force'}
          </h2>
          {result2.status === 'processing' && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                <div
                  className="bg-green-600 h-4 rounded-full transition-all duration-300"
                  style={{ width: `${result2.progress}%` }}
                ></div>
              </div>
            </div>
          )}
          {result2.result && (
            <div className="space-y-2">
              <img
                src={toDataUrl(result2.result)}
                alt={`${algo2} result`}
                className="w-full rounded-lg"
              />
              <p className="text-sm text-gray-600">Elapsed time: {result2.elapsedTime.toFixed(2)}ms</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
