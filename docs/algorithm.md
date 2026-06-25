# 演算法詳解

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

## 2. 西洋棋盤 PNG 演算法

將圖片轉換成「西洋棋盤狀」的半透明 PNG，繞過 X 平台的 1MB 圖片再壓縮限制。

### 2.1 演算法流程

```
Input: sourceImage
Output: checkerboardPNG (≤ 1MB)

1. 色彩量化（Median-cut）
   → 將顏色數量減少到 32 色

2. 棋盤格化
   → (x+y) 偶數格：保留色彩、alpha=255
   → (x+y) 奇數格：白色、alpha=0（完全透明）

3. 圖片放大（Upscale）
   → 確保長寬至少 1000px

4. PNG 編碼
   → 使用 upng-js 編碼

5. 大小檢查
   → ≤ 1MB？成功
   → > 1MB？減少顏色數或縮小解析度
```

### 2.2 色彩量化（Median-cut）

將圖片顏色數量減少到指定數量，使用經典的 Median-cut 演算法：

```typescript
function medianCutQuantization(
  rgba: Uint8ClampedArray,
  numColors: number
): [number, number, number][] {
  // 1. 建構顏色直方圖
  const histogram = buildColorHistogram(rgba);
  const colors = Array.from(histogram.values());

  // 2. 初始化一個包含所有顏色的盒子
  let boxes: ColorBox[] = [computeBoxStats(colors)];

  // 3. 迭代切分盒子直到達到目標顏色數
  while (boxes.length < numColors) {
    const boxIndex = findBoxToSplit(boxes);
    const box = boxes[boxIndex];
    if (box.colors.length <= 1) break;

    const [left, right] = splitBoxAtMedian(box);
    boxes = [...boxes.slice(0, boxIndex), ...boxes.slice(boxIndex + 1), left, right];
  }

  // 4. 回傳每個盒子的平均顏色
  return boxes.map(box => averageColor(box.colors));
}
```

**核心步驟：**

| 函式 | 說明 |
|------|------|
| `buildColorHistogram` | 掃過所有像素，把重複的顏色合併成 `{r, g, b, count}` |
| `computeBoxStats` | 記錄 R/G/B 各自的最小最大範圍 |
| `splitBoxAtMedian` | 找出範圍最大的色版，依加權中位數位置切開 |
| `findBoxToSplit` | 選總像素數最多的盒子優先切 |
| `applyQuantization` | 對每個像素做最近鄰比對（歐式距離平方） |

### 2.3 棋盤格化 (Checkerboard)

```typescript
function buildCheckerboard(
  quantized: Uint8ClampedArray,
  width: number,
  height: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if ((x + y) % 2 === 0) {
        // 偶數格：保留色彩
        output[idx] = quantized[idx];
        output[idx + 1] = quantized[idx + 1];
        output[idx + 2] = quantized[idx + 2];
        output[idx + 3] = 255;
      } else {
        // 奇數格：完全透明
        output[idx] = 255;
        output[idx + 1] = 255;
        output[idx + 2] = 255;
        output[idx + 3] = 0;
      }
    }
  }
  return output;
}
```

---

## 3. 插值核函式

### 3.1 Bilinear (雙線性插值)

$$B(x) = \max(0, 1 - |x|)$$

- 感受野：2×2（4 個像素）
- 速度快，但可能模糊或產生鋸齒

### 3.2 Bicubic (雙三次插值) - Mitchell-Netravali

$$B(x) = \begin{cases}
(a+2)|x|^3 - (a+3)|x|^2 + 1 & \text{if } |x| < 1 \\
a|x|^3 - 5a|x|^2 + 8a|x| - 4a & \text{if } 1 \leq |x| < 2 \\
0 & \text{otherwise}
\end{cases}$$

其中 $a = -0.5$

- 感受野：4×4（16 個像素）
- 平衡速度與品質，常用於社群平台

### 3.3 Lanczos (蘭佐斯重取樣)

$$L(x) = \begin{cases}
\frac{\sin(\pi x)}{\pi x} \cdot \frac{\sin(\pi x / a)}{\pi x / a} & \text{if } |x| < a \\
0 & \text{otherwise}
\end{cases}$$

其中 $a = 3$ 或 $a = 4$

- 感受野：4×4 或 6×6
- 最高品質，運算較慢

### 3.4 比較表

| 項目 | 最近鄰 | 雙線性 | 雙三次 | 蘭佐斯 |
|------|--------|--------|--------|--------|
| 感受野大小 | 1×1 | 2×2 | 4×4 | 4×4 or 6×6 |
| 參與計算像素數 | 1 | 4 | 16 | 16 或 36 |
| 計算複雜度 | O(N) | O(4N) | O(16N) | O(16N) ~ O(36N) |
| 圖像品質 | 低（馬賽克） | 中（平滑） | 高（銳利） | 極高（細節最完整） |
| 縮放陷阱利用難度 | 易 | 中 | 難 | 難 |

---

## 4. 隱寫術演算法 (Steganography)

### 4.1 解析法 (Analytical Method)

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

**流程：**
1. 計算載體圖的縮圖
2. 根據長寬比計算秘密圖在載體中的縮放比例和偏移量
3. 對每個 target 像素：
   - 讀取對應的秘密圖像素亮度 (avg > 128 為亮)
   - 根據 `backgroundColor` 設定目標值
   - 計算殘差並以 kernel 權重分佈到周圍像素
4. 使用共軛梯度法求解線性系統

### 4.2 暴力法 (Brute Force Method)

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
): HideImageResult
```

**流程：**
1. 迭代優化：每次迭代隨機調整像素
2. 調整方向：亮像素往正方向，暗像素往負方向
3. 計算測試圖的縮圖與原始載體縮圖的差異
4. 如果 score 變小，保留這次調整

---

## 5. 比較：暴力解 vs 優化解

| 維度 | 暴力模擬法 (Brute Force) | 逆向解析優化法 (Analytical Inverse) |
|------|-------------------------|-------------------------------------|
| 邏輯 | 不斷隨機生成像素排列，枚舉 40 種組合 | 直接根據縮放比例與卷積核進行矩陣運算 |
| 時間複雜度 | O(40 × N)，固定枚舉 | O(N × M × maxIterations) |
| 隱藏效果 | 邊緣會有明顯的噪點殘影 | 能夠達到像素級的精準隱身 |
| 適應性 | 換一個平台就必須重新枚舉 | 透過參數化公式，一秒切換不同平台的縮放模型 |
| 結論 | 適合展示完整搜索過程 | 工程首選，適合處理高畫質影像 |

---

## 6. 效能評估指標

### 6.1 MSE（均方誤差）

$$MSE = \frac{1}{n} \sum_{i=1}^{n} (P_{avg,i} - P_{bg})^2$$

- $P_{avg,i}$ 是縮圖後第 i 個像素的 RGB 平均值
- $P_{bg}$ 是目標背景色（0 或 255）
- MSE 越低，秘密消失越徹底

### 6.2 處理時間

- 記錄演算法執行所需的毫秒數
- 代數法通常比暴力法快數十倍

### 6.3 視覺品質（PSNR）

$$PSNR = 10 \cdot \log_{10}\left(\frac{MAX^2}{MSE}\right)$$

- MAX = 255（像素最大值）
- PSNR > 30dB 表示視覺品質良好

---

## 7. 參考文獻

- Mitchell, D. P., & Netravali, A. N. (1988). Reconstruction filters in computer-graphics.
- Keys, R. G. (1981). Cubic convolution interpolation for digital image processing.
- Duchon, C. E. (1979). Lanczos filtering in one and two dimensions.