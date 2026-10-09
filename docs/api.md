# API 文件

## 概述

本模組實作「Alpha 通道隱寫術」(Alpha Channel Steganography)：將圖片轉換成西洋棋盤狀的半透明 PNG，使得：

- **原尺寸**：保留色彩的像素拼出完整圖片
- **縮圖後**：透明像素在平均時帶入背景色，預覽圖被沖淡、與背景融為一體
- **檔案大小**：≤ 1MB，符合 X 平台的 PNG 限制

---

## 資料類型

### XProcessResult

`processImageForX` 與 `bruteForceXProcess` 的回傳值（定義於 `src/lib/xProcessor.ts`）。

```typescript
interface XProcessResult {
  success: boolean;
  blob?: Blob;          // PNG 檔案
  previewUrl?: string;  // Object URL，不用時需 URL.revokeObjectURL
  width?: number;
  height?: number;
  sizeInMB?: string;    // 例如 "0.87"
  error?: string;
  method?: 'analytical' | 'brute-force';
}
```

### ProcessingProgress / ProcessingResult

動畫演示用（定義於 `src/lib/animatedXProcessor.ts`）。

```typescript
interface ProcessingProgress {
  method: 'analytical' | 'brute-force';
  currentStep: number;
  totalSteps: number;
  stepName: string;
  numColors: number;
  scale: number;
  enumIndex: number;                              // 暴力解目前枚舉到第幾個組合
  enumResults: ('pending' | 'pass' | 'fail')[];   // 40 種組合的結果
  processedPixels: string | null;                 // 該步驟的預覽 data URL
  progress: number;
}

interface ProcessingResult {
  success: boolean;
  previewUrl: string | null;
  width: number;
  height: number;
  sizeInMB: string;
  time: number;                                   // 實際運算時間（ms），不含動畫延遲與暫停
  method: 'analytical' | 'brute-force';
  steps: ProcessingStep[];
}
```

---

## 主流程 API

### processImageForX

優化解：貪婪式搜尋，從 32 色、原解析度開始，逐步減少顏色數、再縮小解析度，直到 PNG ≤ 1MB。

```typescript
function processImageForX(file: File): Promise<XProcessResult>
```

流程：

1. 載入圖片；長或寬小於 1000px 時先放大
2. Median-cut 量化 → 棋盤格化 → upng-js 編碼
3. 大於 1MB 時，顏色數 32 → 16 → 8 → 4 → 2
4. 降到 2 色仍太大，scale 每次減 0.1；scale ≤ 0.3 時回傳失敗

### bruteForceXProcess

暴力解：窮舉 8 種 scale × 5 種顏色數共 40 種組合，保留 ≤ 1MB 的候選後依優先順序挑選（定義於 `src/lib/bruteForceXProcessor.ts`）。

```typescript
function bruteForceXProcess(file: File): Promise<XProcessResult>
```

### processImageAnalyticalWithProgress / processImageBruteForceWithProgress

與上面兩個函式相同的流程與選擇邏輯，但每個步驟都會回報進度，供演算法演示頁播放動畫。

```typescript
function processImageAnalyticalWithProgress(
  imageUrl: string,
  onProgress: (progress: ProcessingProgress) => void,
  isPaused: { value: boolean },
  speed: { value: number },
  signal?: AbortSignal
): Promise<ProcessingResult>

function processImageBruteForceWithProgress(
  imageUrl: string,
  onProgress: (progress: ProcessingProgress) => void,
  isPaused: { value: boolean },
  speed: { value: number },
  signal?: AbortSignal
): Promise<ProcessingResult>
```

- `isPaused`、`speed` 以物件傳入，處理途中修改 `.value` 會立即生效
- `signal` 中止後，函式會以 `AbortError` 結束
- 找不到 ≤ 1MB 的組合時回傳 `success: false`、`previewUrl: null`

---

## 處理步驟 API

定義於 `src/lib/xProcessor.ts`，主流程與動畫處理器共用。

### medianCutQuantization

```typescript
function medianCutQuantization(
  rgba: Uint8ClampedArray,
  numColors: number
): [number, number, number][]
```

以 Median-cut 演算法產生最多 `numColors` 色的調色盤。

### applyQuantization

```typescript
function applyQuantization(
  rgba: Uint8ClampedArray,
  palette: [number, number, number][]
): Uint8ClampedArray
```

把每個像素替換成調色盤中最接近的顏色（歐式距離平方），alpha 一律設為 255。

### buildCheckerboard

```typescript
function buildCheckerboard(
  quantized: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray
```

- `(x+y)` 偶數格：保留量化後的色彩，alpha=255
- `(x+y)` 奇數格：`[255, 255, 255, 0]`，完全透明

### upscaleImage

```typescript
function upscaleImage(
  pixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  targetSize: number
): [Uint8ClampedArray, number, number]
```

維持長寬比，使用 Canvas 高品質平滑把長寬都放大到至少 `targetSize`。

### resizeImage

```typescript
function resizeImage(
  pixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  scale: number
): [Uint8ClampedArray, number, number]
```

以最近鄰取樣依 `scale` 縮放。

---

## React Hooks

### useXProcessor / useBruteForceProcessor

分別包裝 `processImageForX` 與 `bruteForceXProcess`，管理處理狀態。

```typescript
const { status, result, error, processImage, reset } = useXProcessor();
// status: 'idle' | 'processing' | 'done' | 'error'
// result: XProcessResult | null
```

- `processImage(file)`：開始處理；重複呼叫時會忽略前一次的結果
- `reset()`：回到 idle 並釋放 `previewUrl`

---

## 使用範例

```typescript
import { processImageForX } from '@lib/xProcessor';

const result = await processImageForX(file);

if (result.success) {
  console.log(`${result.width}×${result.height}, ${result.sizeInMB} MB`);

  const a = document.createElement('a');
  a.href = result.previewUrl!;
  a.download = 'checkerboard.png';
  a.click();
} else {
  console.error(result.error);
}
```

---

## 備註

- 所有像素資料使用 `Uint8ClampedArray`（RGBA 格式）
- PNG 編碼使用 `UPNG.encode(..., 0)`，`cnum=0` 表示不讓 upng-js 再做量化
- 輸出必須保持 PNG；轉成 JPEG 會失去 Alpha 通道，棋盤格效果也會消失
