export type InterpolationKernel = 'bilinear' | 'bicubic' | 'lanczos';

export type TargetPlatform = 'discord' | 'line' | 'twitter' | 'custom';

export type BackgroundColor = 'white' | 'black';

export type ProcessorStatus = 'idle' | 'processing' | 'done' | 'error';

export type AlgorithmType = 'brute-force' | 'analytical';

export interface PixelPatternConfig {
  density: number;
  minBrightness: number;
  maxBrightness: number;
  colorMode: 'grayscale' | 'chromatic';
  pixelSize?: number;
}

export interface ImageMetadata {
  width: number;
  height: number;
  channels: number;
}

export interface ImageDataTyped {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

export interface SharedImageData extends ImageDataTyped {
  dataUrl: string;
}

export interface PlatformConfig {
  name: string;
  strategy: 'bounding-box' | 'long-edge';
  maxWidth?: number;
  maxHeight?: number;
  maxEdge?: number;
  tiers?: Record<string, { label: string; maxEdge: number }>;
  kernel: InterpolationKernel;
  quality: number;
}

export interface HiddenMessage {
  text: string;
  strength: number;
}

export interface ProcessingResult {
  success: boolean;
  data?: ImageData;
  error?: string;
}

export interface StegoConfig {
  interpolationKernel: InterpolationKernel;
  targetWidth: number;
  targetHeight: number;
  strength: number;
  tileSize: number;
  overlap: number;
}

export interface AlgorithmMetrics {
  mse: number;
  psnr: number;
  elapsedTime: number;
  memoryPeakMB: number;
}

export interface AlgorithmComparison {
  analytical: {
    result: ImageDataTyped | null;
    metrics: AlgorithmMetrics;
  };
  bruteForce: {
    result: ImageDataTyped | null;
    metrics: AlgorithmMetrics;
  };
}

export interface WorkerRequest {
  algorithm: AlgorithmType;
  coverImage: ImageDataTyped;
  secretImage: ImageDataTyped;
  config: StegoConfig;
  tileIndex?: number;
  totalTiles?: number;
}

export interface WorkerResponse {
  type: 'progress' | 'result' | 'error';
  tileIndex?: number;
  progress?: number;
  result?: ImageDataTyped;
  metrics?: AlgorithmMetrics;
  error?: string;
}

export const DEFAULT_PIXEL_CONFIG: PixelPatternConfig = {
  density: 0.08,
  minBrightness: 40,
  maxBrightness: 100,
  colorMode: 'chromatic',
  pixelSize: 48,
};

export const DEFAULT_STEGO_CONFIG: StegoConfig = {
  interpolationKernel: 'bicubic',
  targetWidth: 500,
  targetHeight: 500,
  strength: 0.8,
  tileSize: 128,
  overlap: 16,
};

export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  discord: {
    name: 'Discord',
    strategy: 'bounding-box',
    maxWidth: 1100,
    maxHeight: 700,
    kernel: 'bicubic',
    quality: 0.85,
  },
  line: {
    name: 'LINE',
    strategy: 'long-edge',
    maxEdge: 1200,
    kernel: 'bilinear',
    quality: 0.85,
  },
  twitter: {
    name: 'X (Twitter)',
    strategy: 'long-edge',
    maxEdge: 2048,
    tiers: {
      small: { label: 'Small', maxEdge: 680 },
      medium: { label: 'Medium', maxEdge: 1200 },
      large: { label: 'Large', maxEdge: 2048 },
    },
    kernel: 'bicubic',
    quality: 0.9,
  },
  custom: {
    name: 'Custom',
    strategy: 'bounding-box',
    maxWidth: 1920,
    maxHeight: 1080,
    kernel: 'lanczos',
    quality: 1.0,
  },
};
