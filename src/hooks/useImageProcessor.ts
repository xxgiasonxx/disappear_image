import { useCallback, useRef, useState } from 'react';
import type { ImageDataTyped, StegoConfig, AlgorithmType } from '@lib/types';

interface ProcessingState {
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  result: ImageDataTyped | null;
  elapsedTime: number;
  error: string | null;
}

export function useImageProcessor() {
  const [state, setState] = useState<ProcessingState>({
    status: 'idle',
    progress: 0,
    result: null,
    elapsedTime: 0,
    error: null,
  });

  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<string>('');

  const processImage = useCallback(
    (algorithm: AlgorithmType, coverImage: ImageDataTyped, secretImage: ImageDataTyped, config: StegoConfig) => {
      return new Promise<ImageDataTyped>((resolve, reject) => {
        if (workerRef.current) {
          workerRef.current.terminate();
        }

        const requestId = Math.random().toString(36).substring(7);
        requestIdRef.current = requestId;

        // Create new worker
        const worker = new Worker(new URL('@workers/imageProcessor.worker.ts', import.meta.url), { type: 'module' });
        workerRef.current = worker;

        setState({
          status: 'processing',
          progress: 0,
          result: null,
          elapsedTime: 0,
          error: null,
        });

        worker.onmessage = (event) => {
          const data = event.data;

          if (data.type === 'progress') {
            setState((prev) => ({
              ...prev,
              progress: data.progress,
            }));
          } else if (data.type === 'result') {
            setState({
              status: 'done',
              progress: 100,
              result: data.result,
              elapsedTime: data.elapsedTime,
              error: null,
            });
            resolve(data.result);
            worker.terminate();
            workerRef.current = null;
          } else if (data.type === 'error') {
            setState({
              status: 'error',
              progress: 0,
              result: null,
              elapsedTime: 0,
              error: data.error,
            });
            reject(new Error(data.error));
            worker.terminate();
            workerRef.current = null;
          }
        };

        worker.onerror = (error) => {
          setState({
            status: 'error',
            progress: 0,
            result: null,
            elapsedTime: 0,
            error: error.message || 'Worker error',
          });
          reject(new Error(error.message || 'Worker error'));
          worker.terminate();
          workerRef.current = null;
        };

        worker.postMessage({
          id: requestId,
          algorithm,
          coverImage,
          secretImage,
          config,
        });
      });
    },
    []
  );

  const cancelProcessing = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setState({
      status: 'idle',
      progress: 0,
      result: null,
      elapsedTime: 0,
      error: 'Cancelled by user',
    });
  }, []);

  return {
    ...state,
    processImage,
    cancelProcessing,
  };
}
