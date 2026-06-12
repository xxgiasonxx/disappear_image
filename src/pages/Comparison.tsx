import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ImageDataTyped } from '@lib/types';
import { generateCoverImage, generateSecretImage } from '@lib/exampleGenerator';
import { useImageProcessor } from '@/hooks/useImageProcessor';

export function Comparison() {
  const [originalImage] = useState<ImageDataTyped>(() => generateCoverImage(400, 400));
  const [secretImage] = useState<ImageDataTyped>(() => generateSecretImage(100, 100));
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const { processImage, status, progress, result, elapsedTime, cancelProcessing } = useImageProcessor();

  // Convert original to data URL for display
  const originalDataUrl = useMemo(() => {
    if (!originalImage) return '';
    const canvas = document.createElement('canvas');
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
      const imageData = new ImageData(new Uint8ClampedArray(originalImage.pixels), originalImage.width, originalImage.height);
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL();
  }, [originalImage]);

  const handleSliderChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleGenerate = useCallback(() => {
    processImage('analytical', originalImage, secretImage, {
      interpolationKernel: 'bilinear',
      targetWidth: 100,
      targetHeight: 100,
      strength: 0.8,
      tileSize: 64,
      overlap: 8,
    });
  }, [processImage, originalImage, secretImage]);

  // Canvas drawing for the full result
  const resultCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!resultCanvasRef.current || !result) return;
    const canvas = resultCanvasRef.current;
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imageData = new ImageData(new Uint8ClampedArray(result.pixels), result.width, result.height);
      ctx.putImageData(imageData, 0, 0);
    }
  }, [result]);

  // Canvas drawing for the slider (original part)
  const sliderOriginalCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!sliderOriginalCanvasRef.current || !originalImage) return;
    const canvas = sliderOriginalCanvasRef.current;
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
    const imageData = new ImageData(new Uint8ClampedArray(originalImage.pixels), originalImage.width, originalImage.height);
      ctx.putImageData(imageData, 0, 0);
    }
  }, [originalImage]);

  // Canvas drawing for the slider (processed part)
  const sliderProcessedCanvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!sliderProcessedCanvasRef.current || !result) return;
    const canvas = sliderProcessedCanvasRef.current;
    canvas.width = result.width;
    canvas.height = result.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imageData = new ImageData(new Uint8ClampedArray(result.pixels), result.width, result.height);
      ctx.putImageData(imageData, 0, 0);
    }
  }, [result]);

  // Slider canvas clip path style
  const sliderStyle: React.CSSProperties = {
    clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
  };

  return (
    <div className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">Comparison</h1>

      <div className="mb-8 space-y-4">
        <button
          onClick={handleGenerate}
          disabled={status === 'processing'}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {status === 'processing' ? 'Processing...' : 'Process Image'}
        </button>
        {status === 'processing' && (
          <button
            onClick={cancelProcessing}
            className="px-6 py-3 bg-red-600 text-white rounded hover:bg-red-700 ml-4"
          >
            Cancel
          </button>
        )}
      </div>

      {status === 'processing' && (
        <div className="mb-6">
          <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
            <div
              className="bg-blue-600 h-4 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 mt-2">Progress: {progress}%</p>
        </div>
      )}

      {result && status === 'done' && (
        <div className="space-y-8">
          <div className="text-green-600 font-medium">
            Done! Elapsed time: {elapsedTime.toFixed(2)}ms
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h2 className="text-xl font-semibold mb-4">Before (Original)</h2>
              <img
                src={originalDataUrl}
                alt="Original"
                className="w-full rounded-lg shadow-lg"
              />
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-4">After (Processed)</h2>
              <canvas
                ref={resultCanvasRef}
                className="w-full rounded-lg shadow-lg max-w-full"
              />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Side-by-Side Slider</h2>
            <div
              ref={containerRef}
              onMouseMove={handleSliderChange}
              onClick={handleSliderChange}
              className="relative w-full cursor-ew-resize border rounded-lg overflow-hidden"
              style={{ aspectRatio: '1', maxWidth: '600px' }}
            >
              <canvas
                ref={sliderOriginalCanvasRef}
                style={{ display: 'none' }}
              />
              <img
                src={originalDataUrl}
                alt="Original"
                className="absolute inset-0 w-full h-full object-cover"
                draggable={false}
              />
              {result && (
                <canvas
                  ref={sliderProcessedCanvasRef}
                  className="absolute inset-0 w-full h-full object-cover"
                  style={sliderStyle}
                />
              )}
              <div
                className="absolute inset-y-0 w-px bg-white"
                style={{ left: `${sliderPosition}%`, boxShadow: '0 0 4px rgba(0,0,0,0.5)' }}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">Click or drag on image to adjust slider</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 text-red-600">
          Error processing image. Please try again.
        </div>
      )}
    </div>
  );
}