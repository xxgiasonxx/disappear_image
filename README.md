# Disappear Image - 縮放之下的消失點

「我看得到你，但我看不見你。」

一個探索「抗重採樣隱寫術」(Anti-Downsampling Steganography) 的互動式網站，利用社群平台縮圖演算法的漏洞，達成預覽圖與原始圖的資訊落差。

![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?logo=tailwindcss)

---

##線上體驗

前往 [disappear-image.vercel.app](https://disappear-image.vercel.app) 立即體驗。

---

## 研究背景

在現今社群平台（Discord、Instagram、Facebook、 LINE、X）盛行的時代，圖片在傳輸過程中不可避免地會經過伺服器端的「二次處理」，其中最核心的操作就是重採樣縮放 (Resampling / Resizing)。

這個想法起源於在 X（前身 Twitter）上看到的一篇圖文：縮小時只能看到「TAP」，點開後才能看到真正的內容。深入研究後發現，這是利用像素點排列與縮圖演算法的特性，達成的一種視覺魔術。

---

## 核心概念

### 抗重採樣隱寫術

當社群平台將圖片下採樣 (Downsampling) 時，會使用插值演算法計算目標像素的值。我們利用這個特性，在原始圖片中植入特定的高頻訊號，這些訊號在原始尺寸可見，但經過縮放後會與背景融為一體。

### 西洋棋盤 PNG 演算法

將圖片轉換成「西洋棋盤狀」的半透明 PNG——奇數格完全透明、偶數格保留色彩。這是繞過 X 平台圖片再壓縮機制（限制 1MB）的技巧，讓上傳的圖在 1MB 以內仍保有不錯的畫質。

### 高頻訊息隱匿 (HF Information Hiding)

影像縮放本質上是像素的重新採樣。常用的演算法如雙線性插值 (Bilinear) 或 雙三次插值 (Bicubic) 會根據權重計算鄰近像素的平均值。我們利用數學公式逆向推導：

$$P_{dst} = \sum_{i=1}^{n} w_i \cdot P_{src,i}$$

其中 $P_{dst}$ 是縮圖後的像素，$w_i$ 是演算法權重。我們透過調整 $P_{src}$ 的極微小差異，讓 $\sum w_i \cdot P_{src,i}$ 的結果趨近於背景色，使秘密訊息在低解析度下成為「統計誤差」。

---

## 功能概覽

### 頁面一：對比展示 (`/`)

左側展示原始圖片，右側展示處理後的圖片。中間有一條可拖動的分隔線，使用者可拖動查看兩圖差異。

### 頁面二：演算法演示 (`/algorithm`)

展示優化解 vs 暴力解的比較，有動畫效果展示運算過程，顯示兩種方法的處理時間差異。

### 頁面三：演算法說明 (`/explanation`)

使用視覺化方式解說虛擬碼運作原理，逐步展示演算法流程，支援動畫播放控制。

### 頁面四：互動實驗區 (`/playground`)

- 圖片上傳區域（支援拖曳）
- 選擇目標平台的縮圖尺寸 (Discord, LINE, X 等)
- 即時預覽處理結果
- 下載處理後的圖片

---

## 支援的平台

| 平台 | 預設尺寸 | 使用的 Kernel |
|------|----------|---------------|
| Discord | 1100×700 | Bicubic |
| LINE | 1200×1200 (long-edge) | Bilinear |
| X (Twitter) | 2048×2048 (small: 680) | Bicubic |
| Custom | 自定義 | 自定義 |

---

## 技術架構

### 技術棧

- **前端框架**: React 18+ with TypeScript (strict mode)
- **建構工具**: Vite
- **圖片處理**: 原生 Canvas API + UPNG.js
- **樣式**: Tailwind CSS + daisyUI (Nord 暗色主題)
- **動畫**: Framer Motion
- **路由**: React Router v7

### 專案結構

```
src/
├── components/          # React 元件
│   ├── ImageUploader/   # 圖片上傳元件
│   ├── PixelBackground/ # 像素背景元件
│   ├── Navigation/      # 導航元件
│   └── FloatingButtons/ # 主題切換 + 回到頂部
├── lib/                 # 演算法核心函式庫
│   ├── types.ts         # 類型定義與常數
│   ├── interpolation.ts # 插值演算法 (kernel functions)
│   ├── steganography.ts # 隱寫術演算法
│   ├── xProcessor.ts    # X 平台處理器
│   └── imageUtils.ts    # 圖片工具函式
├── pages/               # 頁面元件
│   ├── Comparison.tsx    # 對比展示
│   ├── AlgorithmDemo.tsx # 演算法演示
│   ├── Explanation.tsx   # 演算法說明
│   └── Playground.tsx    # 互動實驗區
├── hooks/               # React Hooks
│   ├── useXProcessor.ts
│   ├── useImageProcessor.ts
│   └── useBruteForceProcessor.ts
└── App.tsx
```

### 演算法核心

#### 1. Median-cut 色彩量化

將圖片顏色數量減少到指定數量，使用經典的 Median-cut 演算法：

1. `buildColorHistogram`：掃過所有像素，把重複的顏色合併
2. `computeBoxStats`：把顏色包成「色彩空間中的盒子」
3. `splitBoxAtMedian`：找出盒子裡範圍最大的色版，依中位數切開
4. `findBoxToSplit`：選總像素數最多的盒子優先切
5. `applyQuantization`：對每個像素做最近鄰比對

#### 2. 棋盤格化 (Checkerboard)

將量化後的圖片轉換成西洋棋盤格式：

- `(x+y)` 為偶數的格子：保留色彩、alpha=255
- `(x+y)` 為奇數的格子：強制設成完全透明的白色

#### 3. 暴力法 vs 代數解

| 維度 | 暴力模擬法 (Brute Force) | 逆向解析優化法 (Analytical Inverse) |
|------|-------------------------|-------------------------------------|
| 邏輯 | 不斷隨機生成像素排列，枚舉 40 種組合 | 直接根據縮放比例與卷積核進行矩陣運算 |
| 時間複雜度 | O(40 × N)，固定枚舉 | O(N × M)，一次運算 |
| 隱藏效果 | 邊緣會有明顯的噪點殘影 | 能夠達到像素級的精準隱身 |
| 結論 | 適合展示完整搜索過程 | 工程首選，適合處理高畫質影像 |

---

## 安裝與開發

```bash
# 克隆專案
git clone https://github.com/your-username/disappear_image.git
cd disappear_image

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 型別檢查
npm run typecheck

# ESLint
npm run lint

# 執行測試
npm run test

# 建構生產版本
npm run build
```

---

## 縮放演算法比較

| 項目 | 最近鄰 | 雙線性 | 雙三次 | 蘭佐斯 |
|------|--------|--------|--------|--------|
| 感受野大小 | 1×1 | 2×2 | 4×4 | 4×4 or 6×6 |
| 計算複雜度 | O(N) | O(4N) | O(16N) | O(16N) ~ O(36N) |
| 圖像品質 | 低（馬賽克） | 中（平滑） | 高（銳利） | 極高（細節最完整） |
| 縮放陷阱利用難度 | 易（確定性最高） | 中（線性係數） | 難（多項式係數） | 難（振盪函數係數） |

---

## 應用場景

- **數位迷因創作**：在社群媒體上製作「點開有驚喜」的互動圖片
- **脆弱浮水印 (Fragile Watermarking)**：用於檢測圖片是否被未經授權的縮放或裁切
- **視覺藝術探索**：研究人類視覺系統對不同頻率訊號的感知邊界
- **平台相容性研究**：理解不同平台如何處理上傳的圖片

---

## 技術挑戰

1. **插值演算法的多樣性**：不同平台使用的 Kernel 不同（Bilinear vs Lanczos），需要找到交集
2. **色彩空間壓縮**：JPEG 的破壞性壓縮（Lossy Compression）會改變像素值
3. **極致效能要求**：處理千萬級像素的矩陣運算，需使用 Web Workers 確保 UI 順暢
4. **檔案大小限制**：X 平台的 1MB 限制需要透過色彩量化與棋盤格化來繞過

---

## 效能評估指標

### MSE（均方誤差）

$$MSE = \frac{1}{n} \sum_{i=1}^{n} (P_{avg,i} - P_{bg})^2$$

- MSE 越低，秘密消失越徹底

### 處理時間

- 記錄演算法執行所需的毫秒數
- 代數法通常比暴力法快數十倍

### 視覺品質（PSNR）

$$PSNR = 10 \cdot \log_{10}\left(\frac{MAX^2}{MSE}\right)$$

- MAX = 255（像素最大值）
- PSNR > 30dB 表示視覺品質良好

---

## 警告

本專案僅供學術研究與技術交流。請勿利用此技術傳播違反社群準則之內容。

---

## 致謝

- 灵感来源：与朋友在 X 平台上看到的一张视觉魔术图片
- Interpolation kernels: Mitchell-Netravali Bicubic, Lanczos resampling

---

##  License

MIT