import { useEffect, useRef, useCallback } from 'react';
import { DEFAULT_PIXEL_CONFIG } from '@lib/types';
import type { PixelPatternConfig } from '@lib/types';

export function PixelBackground({
  density = DEFAULT_PIXEL_CONFIG.density,
  minBrightness = DEFAULT_PIXEL_CONFIG.minBrightness,
  maxBrightness = DEFAULT_PIXEL_CONFIG.maxBrightness,
  colorMode = DEFAULT_PIXEL_CONFIG.colorMode,
  pixelSize = DEFAULT_PIXEL_CONFIG.pixelSize ?? 48,
  opacity = 0.6,
}: Partial<PixelPatternConfig> & { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateNoisePattern = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cfg: Required<PixelPatternConfig>,
      alpha: number
    ) => {
      const blockSize = cfg.pixelSize;
      const cols = Math.ceil(width / blockSize);
      const rows = Math.ceil(height / blockSize);

      const noiseFunction = (x: number, y: number, seed: number): number => {
        const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
        return n - Math.floor(n);
      };

      const seed = Date.now() % 10000;

      ctx.clearRect(0, 0, width, height);

      for (let by = 0; by < rows; by++) {
        for (let bx = 0; bx < cols; bx++) {
          const noise = noiseFunction(bx, by, seed);

          if (noise > cfg.density) continue;

          const brightness =
            Math.floor(
              noise * (cfg.maxBrightness - cfg.minBrightness)
            ) + cfg.minBrightness;

          let r: number, g: number, b: number;

          if (cfg.colorMode === 'chromatic') {
            const shift = (bx + by) % 3;
            r = shift === 0 ? brightness + 2 : brightness;
            g = shift === 1 ? brightness + 1 : brightness;
            b = shift === 2 ? brightness : brightness;
          } else {
            r = brightness;
            g = brightness;
            b = brightness + 2;
          }

          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
          ctx.fillRect(bx * blockSize, by * blockSize, blockSize, blockSize);
        }
      }
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const config: Required<Omit<PixelPatternConfig, 'opacity'>> = {
      density,
      minBrightness,
      maxBrightness,
      colorMode,
      pixelSize,
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      generateNoisePattern(ctx, canvas.width, canvas.height, config, opacity);
    };

    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [density, minBrightness, maxBrightness, colorMode, pixelSize, opacity, generateNoisePattern]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      aria-hidden="true"
    />
  );
}
