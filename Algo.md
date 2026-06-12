# 高頻訊息隱匿演算法 (HF Information Hiding Algorithm)

## 1. 核心原理

影像縮放的本質是像素的重新採樣。當平台將高解析度圖片下採樣 (Downsampling) 時，會使用插值演算法計算目標像素的值。我們利用這個特性，在原始圖片中植入特定的高頻訊號，這些訊號在原始尺寸可見，但經過縮放後會與背景融為一體。

### 1.1 數學基礎

設原始影像為 $I_{src}$，目標縮圖為 $I_{dst}$。縮放過程可表示為：

$$I_{dst}(x, y) = \sum_{i=0}^{k-1} \sum_{j=0}^{k-1} w_{i,j} \cdot I_{src}(x \cdot s_x + i, y \cdot s_y + j)$$

其中：
- $s_x, s_y$ 為縮放比例
- $k$ 為卷積核大小 (Kernel Size)
- $w_{i,j}$ 為卷積核權重

### 1.2 目標

找到一組像素值 $P_{src}$，使得：

$$\sum w_i \cdot P_{src,i} = P_{target}$$

其中 $P_{target}$ 是目標像素值（通常為背景色 0 或 255）。

---

## 2. 演算法比較

### 2.1 暴力搜尋法 (Brute Force)

```
Input: sourcePixels[], secretPixels[], backgroundColor, kernel[], iterations
Output: encodedPixels[]

1. FOR 每個目標像素 (dx, dy) DO
2.   取得對應的秘密像素 isLight
3.   targetVal = isLight ? bgValue : 1 - bgValue
4.   收集周圍採樣點 samples[] 及其 kernel 權重
5.
6.   暴力測試候選值: {0, 32, 64, 96, 128, 160, 192, 224, 255}
7.   FOR 每個候選值 v DO
8.     weightedSum = Σ samples[i].weight * v
9.     predicted = weightedSum / Σ samples[i].weight
10.    error = |predicted - targetVal|
11.    IF error < bestError THEN
12.      bestValue = v
13.    END IF
14.  END FOR
15.
16.  delta = (bestValue - 128) * direction * strength
17.  FOR 每個採樣點 DO
18.    adjust = delta * sample.weight
19.    outputPixels[pIdx] += adjust
20.  END FOR
21. END FOR
```

**時間複雜度**: O(N × K × M)，其中 N 為目標像素數，K 為候選值數量，M 為採樣點數

**特點**:
- 窮舉測試有限候選值（9 個離散值）
- 選擇讓縮圖結果與目標值誤差最小的值
- 適用於小尺寸圖片

### 2.2 優化代數解 (Analytical Inverse)

```
Input: sourcePixels[], secretPixels[], backgroundColor, kernel[], strength
Output: encodedPixels[]

1. FOR 每個目標像素 (dx, dy) DO
2.   取得對應的秘密像素 isLight
3.   targetVal = isLight ? bgValue : 1 - bgValue
4.   收集周圍採樣點 samples[] 及其 kernel 權重
5.
6.   建構線性系統 A · x = b
7.   A[s][blockIdx] = samples[s].weight (權重矩陣)
8.   b[blockIdx] = (targetVal - 128) * strength (目標殘差)
9.
10.  使用共軛梯度法求解 x (最小化 ||Ax - b||²)
11.  對每個採樣點套用調整值
12.   adjust = x[s] * direction * strength
13.   outputPixels[pIdx] += adjust
14. END FOR
```

**時間複雜度**: O(N × M × maxIterations)，其中 M 為採樣點數，maxIterations 為梯度法迭代次數

**優勢**:
- 一次運算即可完成精確求解
- 像素級精準隱身
- 參數化，可快速適應不同平台

---

## 3. 詳細演算法流程

### 3.1 共用函式：downsampleImage

```typescript
function downsampleImage(
  srcPixels: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
  kernel: InterpolationKernel
): DownsampledImage {
  const kernelFn = getKernelFunction(kernel);
  const scaleX = srcWidth / dstWidth;
  const scaleY = srcHeight / dstHeight;
  const baseRadius = kernel === 'lanczos' ? 3 : 2;
  const sampleRadius = Math.ceil(baseRadius * Math.max(scaleX, scaleY));

  // 對每個目標像素進行加權採樣
  for (let dy = 0; dy < dstHeight; dy++) {
    for (let dx = 0; dx < dstWidth; dx++) {
      const srcX = dx * scaleX;
      const srcY = dy * scaleY;
      // ... 收集周圍像素並加權平均
    }
  }
}
```

### 3.2 暴力法實作：hideImageBruteForce

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
  kernel: InterpolationKernel = 'bicubic'
): HideImageResult {
  const bgValue = backgroundColor === 'white' ? 255 : 0;

  for (let dy = 0; dy < targetHeight; dy++) {
    for (let dx = 0; dx < targetWidth; dx++) {
      const isLight = getSecretPixelLight(dy, dx);
      const targetVal = isLight ? bgValue : 1 - bgValue;

      const samples = collectSamples(srcX, srcY, carrierScaleX, carrierScaleY);

      // 窮舉測試 9 個候選值
      const searchValues = [0, 32, 64, 96, 128, 160, 192, 224, 255];
      let bestValue = 128;
      let bestError = Infinity;

      for (const testValue of searchValues) {
        const weightedSum = samples.reduce((sum, s) => sum + s.weight * testValue, 0);
        const predicted = weightedSum / samples.reduce((sum, s) => sum + s.weight, 0);
        const error = Math.abs(predicted - targetVal);

        if (error < bestError) {
          bestError = error;
          bestValue = testValue;
        }
      }

      // 應用最佳調整值
      const delta = (bestValue - 128) * direction * strength;
      for (const sample of samples) {
        applyAdjustment(sample.px, sample.py, delta * sample.weight);
      }
    }
  }
}
```

### 3.3 解析法實作：hideImageAnalytical + solveLeastSquares

```typescript
function solveLeastSquares(
  kernelWeights: number[][],  // A: m x n 權重矩陣
  targetValues: number[],      // b: n 目標值
  sampleCount: number
): number[] {
  // 使用共軛梯度法求解 Ax = b
  const solution = new Array(m).fill(0);
  const tolerance = 1e-10;
  const maxIterations = 100;

  for (let iter = 0; iter < maxIterations; iter++) {
    const residual: number[] = [];
    for (let i = 0; i < sampleCount; i++) {
      let sum = 0;
      for (let j = 0; j < m; j++) {
        sum += kernelWeights[j][i] * solution[j];
      }
      residual.push(targetValues[i] - sum);
    }

    const rTr = residual.reduce((sum, r) => sum + r * r, 0);
    if (rTr < tolerance) break;

    // ... 共軛梯度疊代
  }

  return solution;
}

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
): HideImageResult {
  const bgValue = backgroundColor === 'white' ? 255 : 0;

  for (let dy = 0; dy < targetHeight; dy++) {
    for (let dx = 0; dx < targetWidth; dx++) {
      const isLight = getSecretPixelLight(dy, dx);
      const targetVal = isLight ? bgValue : 1 - bgValue;

      const samples = collectSamples(srcX, srcY, carrierScaleX, carrierScaleY);
      const n = blockSize * blockSize;

      // 建構線性系統
      const kernelWeights = samples.map(() => new Array(n).fill(0));
      const targetValues = [];

      for (let blockIdx = 0; blockIdx < n; blockIdx++) {
        for (let s = 0; s < samples.length; s++) {
          kernelWeights[s][blockIdx] = samples[s].weight;
        }
        targetValues.push((targetVal - 128) * strength);
      }

      // 求解線性系統
      const adjustments = solveLeastSquares(kernelWeights, targetValues, n);

      // 應用調整值
      for (let s = 0; s < samples.length; s++) {
        const adjust = adjustments[s] * direction * strength;
        applyAdjustment(samples[s].px, samples[s].py, adjust);
      }
    }
  }
}
```

### 3.4 MSE 評估

```typescript
function calculateMSE(
  thumbPixels: Uint8ClampedArray,
  bgValue: number  // 0 (黑色) 或 255 (白色)
): number {
  let sumSqDiff = 0;
  let count = 0;

  for (let i = 0; i < thumbPixels.length; i += 4) {
    const avg = (thumbPixels[i] + thumbPixels[i + 1] + thumbPixels[i + 2]) / 3;
    const diff = avg - bgValue;
    sumSqDiff += diff * diff;
    count++;
  }

  return count > 0 ? sumSqDiff / count : Infinity;
}
```

MSE 越低表示縮圖後的圖片與背景色越接近（秘密消失越徹底）。

---

## 4. 卷積核定義

### 4.1 Bilinear

$$B(x) = \max(0, 1 - |x|)$$

### 4.2 Bicubic (Mitchell-Netravali)

$$B(x) = \begin{cases} (a+2)|x|^3 - (a+3)|x|^2 + 1 & \text{if } |x| < 1 \\ a|x|^3 - 5a|x|^2 + 8a|x| - 4a & \text{if } 1 \leq |x| < 2 \\ 0 & \text{otherwise} \end{cases}$$

其中 $a = -0.5$

### 4.3 Lanczos

$$L(x) = \begin{cases} \frac{\sin(\pi x)}{\pi x} \cdot \frac{\sin(\pi x / a)}{\pi x / a} & \text{if } |x| < a \\ 0 & \text{otherwise} \end{cases}$$

其中 $a = 3$ 或 $a = 4$

---

## 5. 支援的平台參數

| 平台 | 預設尺寸 | 使用的 Kernel |
|------|----------|---------------|
| Discord | 500×500 | Bicubic |
| LINE | 1200×1200 | Bilinear |
| X (Twitter) | 1200×675 | Bicubic |

---

## 6. 效能評估指標

### 6.1 MSE（均方誤差）

$$MSE = \frac{1}{n} \sum_{i=1}^{n} (P_{avg,i} - P_{bg})^2$$

- $P_{avg,i}$ 是縮圖後第 i 個像素的 RGB 平均值
- $P_{bg}$ 是目標背景色（0 或 255）
- MSE 越低，秘密消失越徹底

### 6.2 處理時間

- 記錄演算法執行所需的毫秒數
- 解析法通常比暴力法快數十倍

### 6.3 視覺品質（PSNR）

$$PSNR = 10 \cdot \log_{10}\left(\frac{MAX^2}{MSE}\right)$$

- MAX = 255（像素最大值）
- PSNR > 30dB 表示視覺品質良好

---

## 7. 參考文獻

- Mitchell, D. P., & Netravali, A. N. (1988). Reconstruction filters in computer-graphics.
- Keys, R. G. (1981). Cubic convolution interpolation for digital image processing.
- Duchon, C. E. (1979). Lanczos filtering in one and two dimensions.