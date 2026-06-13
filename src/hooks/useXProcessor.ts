import { useState, useCallback, useRef } from 'react';
import { processImageForX } from '@lib/xProcessor';
import type { XProcessResult } from '@lib/xProcessor';

interface ProcessorState {
  status: 'idle' | 'processing' | 'done' | 'error';
  result: XProcessResult | null;
  error: string | null;
}

export function useXProcessor() {
  const [state, setState] = useState<ProcessorState>({
    status: 'idle',
    result: null,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const processImage = useCallback(async (file: File) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setState({ status: 'processing', result: null, error: null });

    try {
      const result = await processImageForX(file);

      if (abortController.signal.aborted) return;

      if (result.success) {
        setState({ status: 'done', result, error: null });
      } else {
        setState({ status: 'error', result: null, error: result.error || '處理失敗' });
      }
    } catch (error) {
      if (!abortController.signal.aborted) {
        setState({
          status: 'error',
          result: null,
          error: error instanceof Error ? error.message : '未知錯誤',
        });
      }
    }
  }, []);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (state.result?.previewUrl) {
      URL.revokeObjectURL(state.result.previewUrl);
    }
    setState({ status: 'idle', result: null, error: null });
  }, [state.result]);

  return { ...state, processImage, reset };
}
