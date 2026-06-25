# API 文档

## 概述

本模組實作「抗重採樣隱寫術」，將秘密圖片藏入載體圖片中，使得：
- **原始尺寸**：可見秘密圖片
- **縮圖後**：秘密圖片消失（被插值演算法平均掉）

---

## 資料類型

### InterpolationKernel

```typescript
type InterpolationKernel = 'bilinear' | 'bicubic' | 'lanczos';
```

| 核心 | 特性 |
|------|------|
| `bilinear` | 速度快，但可能模糊/鋸齒 |
| `bicubic` | 平衡速度與品質，常用於社群平台 |
| `lanczos` | 最高品質，運算較慢 |

### HideImageResult

```typescript
interface HideImageResult {
  success: boolean;
  pixels?: Uint8ClampedArray;
  width?: number;
  height?: number;
  error?: string;
}
```

### DownsampledImage

```typescript
interface DownsampledImage {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}
```

### PlatformConfig

```typescript
interface PlatformConfig {
  name: string;
  strategy: 'bounding-box' | 'long-edge';
  maxWidth?: number;
  maxHeight?: number;
  maxEdge?: number;
  tiers?: Record<string, { label: string; maxEdge: number }>;
  kernel: InterpolationKernel;
  quality: number;
}
```

---

## 函式 API

### downsampleImage

圖片下採樣（縮小），使用指定的核心函式。

```typescript
function downsampleImage(
  srcPixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
  kernel: InterpolationKernel
): DownsampledImage
```

**參數：**

| 參數 | 類型 | 說明 |
|------|------|------|
| `srcPixels` | `Uint8ClampedArray` | 原始圖片像素資料 (RGBA) |
| `srcWidth` | `number` | 原始寬度 |
| `srcHeight` | `number` | 原始高度 |
| `dstWidth` | `number` | 目標寬度 |
| `dstHeight` | `number` | 目標高度 |
| `kernel` | `InterpolationKernel` | 插值核心 |

**內部實作：**
- 動態計算採樣半徑：`sampleRadius = ceil(baseRadius * max(scaleX, scaleY))`
- 對每個目標像素，根據核心函式加權平均周圍源像素

---

### hideImageAnalytical

解析法 (Analytical Method) - 直接計算每個像素應該如何調整。

```typescript
function hideImageAnalytical(
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
): HideImageResult
```

**參數：**

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `carrierPixels` | `Uint8ClampedArray` | - | 載體圖像素 |
| `carrierWidth` | `number` | - | 載體圖寬度 |
| `carrierHeight` | `number` | - | 載體圖高度 |
| `secretPixels` | `Uint8ClampedArray` | - | 秘密圖像素 |
| `secretWidth` | `number` | - | 秘密圖寬度 |
| `secretHeight` | `number` | - | 秘密圖高度 |
| `backgroundColor` | `'white' \| 'black'` | - | 秘密圖底色 |
| `targetWidth` | `number` | - | 目標縮圖寬度 |
| `targetHeight` | `number` | - | 目標縮圖高度 |
| `kernel` | `InterpolationKernel` | `'bicubic'` | 插值核心 |
| `strength` | `number` | `0.8` | 調整強度 (0-1) |

**演算法流程：**

1. 計算載體圖的縮圖 (`downsampledCarrier`)
2. 根據長寬比計算秘密圖在載體中的縮放比例和偏移量
3. 對每個 target 像素：
   - 讀取對應的秘密圖像素亮度 (avg > 128 為亮)
   - 根據 `backgroundColor` 設定目標值 (`bgValue` = 255 或 0)
   - 計算殘差：`residual = (targetVal - carrierVal) * strength`
   - 以 kernel 權重分佈殘差到周圍像素
4. 返回調整後的像素

**原理：**

```
當秘密圖是亮的 → 目標為 bgValue (讓這塊區域變成純底色)
當秘密圖是暗的 → 目標為 1-bgValue (讓這塊區域變成純底色)
藉由 kernel 權重分佈，使得縮圖後這些調整被平均掉
```

---

### hideImageBruteForce

暴力法 (Brute Force Method) - 隨機調整像素，迭代找最佳解。

```typescript
function hideImageBruteForce(
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
  iterations: number = 100
): HideImageResult
```

**參數：**

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `carrierPixels` ~ `backgroundColor` | (同上) | - | (同上) |
| `targetWidth` | `number` | - | 目標縮圖寬度 |
| `targetHeight` | `number` | - | 目標縮圖高度 |
| `kernel` | `InterpolationKernel` | `'bicubic'` | 插值核心 |
| `iterations` | `number` | `100` | 迭代次數 |

**演算法流程：**

1. 計算載體圖的縮圖 (`downsampledCarrier`)
2. 迭代優化：
   - 每次迭代隨機調整 50 個像素
   - 調整方向：亮像素往正方向，暗像素往負方向
   - 計算測試圖的縮圖與原始載體縮圖的差異
   - 如果 score 變小，保留這次調整
3. 返回最佳結果

**Score 計算：**

```typescript
score = Σ |testThumb_avg - carrierThumb_avg|
```

目標是讓處理後的縮圖尽可能接近原始載體的縮圖（秘密消失）。

---

### compareAlgorithms

比較解析法與暴力法的效能和效果。

```typescript
function compareAlgorithms(
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
}
```

**返回値：**

| 欄位 | 說明 |
|------|------|
| `analytical.result` | 解析法結果 |
| `analytical.time` | 解析法耗時 (ms) |
| `analytical.mse` | 解析法縮圖與原載體縮圖的 MSE |
| `bruteForce.*` | 暴力法對應數據 |

**MSE 計算：**

```typescript
mse = Σ[(r₁-r₂)² + (g₁-g₂)² + (b₁-b₂)²] / 3 / pixelCount
```

---

### revealImage

從處理過的圖片中還原秘密圖案。

```typescript
function revealImage(
  carrierPixels: Uint8ClampedArray,
  processedPixels: Uint8ClampedArray,
  width: number,
  height: number,
  threshold: number = 25
): Uint8ClampedArray
```

**參數：**

| 參數 | 類型 | 預設值 | 說明 |
|------|------|--------|------|
| `carrierPixels` | `Uint8ClampedArray` | - | 原始載體圖像素 |
| `processedPixels` | `Uint8ClampedArray` | - | 處理後的圖片像素 |
| `width` | `number` | - | 圖片寬度 |
| `height` | `number` | - | 圖片高度 |
| `threshold` | `number` | `25` | 差異閾值 |

**邏輯：**

- 對每個像素，計算處理前後的 RGB 差異
- 如果 `max(|r₁-r₂|, |g₁-g₂|, |b₁-b₂|) > threshold`
- 輸出灰階值：`min(255, avgDiff * 4)`
- 否則輸出黑色

---

## 使用範例

```typescript
import { hideImageAnalytical, downsampleImage, revealImage } from './lib/steganography';
import { PLATFORM_CONFIGS } from './lib/types';

// 假設已讀取 carrier.jpg 和 secret.png 的像素資料
const carrierPixels: Uint8ClampedArray = /* ... */;
const secretPixels: Uint8ClampedArray = /* ... */;
const carrierWidth = 1920, carrierHeight = 1080;
const secretWidth = 200, secretHeight = 200;

// 選擇平台設定
const config = PLATFORM_CONFIGS['discord']; // 500x500, bicubic

// 藏入秘密
const result = hideImageAnalytical(
  carrierPixels, carrierWidth, carrierHeight,
  secretPixels, secretWidth, secretHeight,
  'white',  // 秘密圖底色
  config.maxWidth, config.maxHeight,
  config.kernel,
  0.8
);

if (result.success && result.pixels) {
  // 下載 result.pixels
}

// 驗證：處理後的圖縮圖應該接近原始載體的縮圖
const processedThumb = downsampleImage(result.pixels!, carrierWidth, carrierHeight, 500, 500, 'bicubic');
const originalThumb = downsampleImage(carrierPixels, carrierWidth, carrierHeight, 500, 500, 'bicubic');
// 兩者應該非常接近（秘密消失）

// 還原秘密
const revealed = revealImage(carrierPixels, result.pixels!, carrierWidth, carrierHeight);
// revealed 現在包含秘密圖案的可視化
```

---

## 平台預設值

```typescript
const PLATFORM_CONFIGS = {
  discord: {
    name: 'Discord',
    maxWidth: 1100,
    maxHeight: 700,
    kernel: 'bicubic',
    quality: 0.85
  },
  line: {
    name: 'LINE',
    maxEdge: 1200,
    kernel: 'bilinear',
    quality: 0.85
  },
  twitter: {
    name: 'X (Twitter)',
    maxEdge: 2048,
    kernel: 'bicubic',
    quality: 0.9
  },
  custom: {
    name: 'Custom',
    maxWidth: 1920,
    maxHeight: 1080,
    kernel: 'lanczos',
    quality: 1.0
  }
};
```

---

## 備註

- 所有像素資料使用 `Uint8ClampedArray` (RGBA format)
- 暴力法的 `_backgroundColor` 參數目前未使用（score 計算已改為與原載體比對）
- 解析法 `strength` 建議設在 0.5-1.0 之間，過低隱藏效果差，過高會有殘影
- `revealImage` 的 `threshold` 應根據圖片特性調整，預設 25