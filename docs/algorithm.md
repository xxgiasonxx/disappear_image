# 演算法詳解

## 1. 核心原理：Alpha 通道隱寫術

PNG 的每個像素除了 R、G、B 之外還有一個 Alpha（透明度）通道。瀏覽器或 App 顯示圖片時，會把像素顏色與底下的背景色做 Alpha 合成：

$$C_{display} = \alpha \cdot C_{pixel} + (1 - \alpha) \cdot C_{bg}$$

- $\alpha = 1$（alpha=255）：完全顯示像素本身的顏色
- $\alpha = 0$（alpha=0）：完全看不到像素，只看得到背景色

本專案把圖片做成「西洋棋盤」：一半像素保留色彩（alpha=255），另一半完全透明（alpha=0）。

- **原尺寸檢視**：每個不透明像素都被完整顯示，人眼會把交錯的色點拼成完整的圖片。
- **縮圖預覽**：平台縮圖時會把相鄰像素平均，透明像素帶進來的是背景色，縮圖顏色因此被往背景色拉近，看起來像被沖淡、模糊甚至消失。

### 1.1 為什麼能塞進 1MB

X 平台對 PNG 有 1MB 的限制，超過就會被再壓縮。棋盤格化同時讓檔案大幅變小：

- 一半像素都是同一個值 `[255, 255, 255, 0]`，PNG 的 Deflate 壓縮非常有效
- 搭配色彩量化（最多 32 色），剩下的像素重複度也很高

---

## 2. 西洋棋盤 PNG 演算法

實作位於 `src/lib/xProcessor.ts`。

### 2.1 演算法流程

```
Input: sourceImage
Output: checkerboardPNG (≤ 1MB)

1. 圖片放大（Upscale）
   → 長或寬小於 1000px 時，放大到至少 1000px

2. 色彩量化（Median-cut）
   → 將顏色數量減少到 numColors 色（從 32 色開始）

3. 棋盤格化
   → (x+y) 偶數格：保留色彩、alpha=255
   → (x+y) 奇數格：白色、alpha=0（完全透明）

4. PNG 編碼
   → 使用 upng-js 編碼（不再額外量化）

5. 大小檢查
   → ≤ 1MB？成功
   → > 1MB？先減少顏色數，不行再縮小解析度，回到步驟 2
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

### 2.4 尺寸調整

| 函式 | 用途 | 方法 |
|------|------|------|
| `upscaleImage` | 把過小的圖放大到至少 1000px，讓棋盤格夠細緻 | Canvas 高品質平滑縮放 |
| `resizeImage` | 檔案仍超過 1MB 時，依 `scale` 縮小解析度 | 最近鄰取樣 |

---

## 3. 參數搜尋：優化解 vs 暴力解

兩種方法使用相同的棋盤格流程，差別在於如何找出符合 1MB 的「顏色數 × 解析度」組合。

### 3.1 優化解（Analytical / `processImageForX`）

貪婪式、單一路徑搜尋，找到就停：

```
numColors = 32, scale = 1.0
LOOP
  量化 → 棋盤格化 → PNG 編碼
  IF size ≤ 1MB THEN RETURN
  IF numColors > 2 THEN numColors = numColors / 2      // 32 → 16 → 8 → 4 → 2
  ELSE scale = scale - 0.1                               // 只用 2 色縮小解析度
       IF scale ≤ 0.3 THEN RETURN 失敗
END LOOP
```

最好情況只編碼 1 次，最差 11 次（scale=1.0 的 5 種顏色數 + scale 0.9~0.4 的 6 次）。

### 3.2 暴力解（Brute Force / `bruteForceXProcess`）

窮舉所有組合後再挑選：

1. `scaleOptions = [1.0, 0.9, …, 0.3]`（8 個）× `colorOptions = [32, 16, 8, 4, 2]`（5 個），共 40 種組合
2. 每種組合都完整跑一次：縮放 → 量化 → 棋盤格化 → PNG 編碼
3. 只保留 ≤ 1MB 的候選
4. 依 `originalOrderIndex` 排序後取第一個：
   - `scale === 1.0`：依顏色數 32→2 給予索引 0~4
   - `scale !== 1.0` 且 `numColors === 2`：索引為 `4 + round((1 - scale) * 10)`
   - 其他組合：`Infinity`（排到最後）

### 3.3 比較

| 維度 | 優化解 | 暴力解 |
|------|--------|--------|
| 搜尋方式 | 貪婪式，找到第一個合格組合就停 | 窮舉 40 種組合後再排序挑選 |
| PNG 編碼次數 | 1 ~ 11 次 | 固定 40 次 |
| 選擇邏輯 | 先用原解析度試 32→2 色，不行才降解析度（只用 2 色） | 與優化解相同的優先順序，結果幾乎一致 |

暴力解是用約 40 倍的運算量換取幾乎相同的結果，主要用於展示完整搜尋過程。

---

## 4. 評估指標

| 指標 | 說明 |
|------|------|
| 檔案大小 | 必須 ≤ 1MB，`sizeInMB` 回傳實際大小 |
| 處理時間 | 兩種方法完成所需的毫秒數（演算法演示頁顯示） |
| 顏色數 / 縮放比例 | 越高代表保留的畫質越好 |

---

## 5. 參考文獻

- Heckbert, P. (1982). Color image quantization for frame buffer display.
- Porter, T., & Duff, T. (1984). Compositing digital images.
