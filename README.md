# Disappear Image - 縮放之下的消失點

「我看得到你，但我看不見你。」

一個探索「Alpha 通道隱寫術」(Alpha Channel Steganography) 的互動式網站，利用 PNG 透明度與社群平台縮圖的特性，達成預覽圖與原始圖的資訊落差。

![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?logo=vite)
![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?logo=tailwindcss)

---

##線上體驗

前往 [disappear-image.vercel.app](https://disappear-image.vercel.app) 立即體驗。

---

## 研究背景

在現今社群平台（Discord、Instagram、Facebook、 LINE、X）盛行的時代，圖片在傳輸過程中不可避免地會經過伺服器端的「二次處理」，其中最核心的操作就是重採樣縮放 (Resampling / Resizing)。

這個想法起源於在 X（前身 Twitter）上看到的一篇圖文：縮小時只能看到「TAP」，點開後才能看到真正的內容。深入研究後發現，這是利用透明像素與不透明像素交錯排列、搭配平台縮圖時的像素平均，達成的一種視覺魔術。

---

## 核心概念

### Alpha 通道隱寫術

利用 PNG 的 Alpha（透明度）通道藏匿資訊：將部分像素設為完全透明（alpha=0）、其餘像素保留色彩（alpha=255）。透明像素實際呈現的是顯示端的背景色，因此當社群平台產生縮圖、將透明與不透明像素混合時，預覽圖會與背景融為一體；點開原圖後，保留色彩的像素才會組合出真正的內容。

### 西洋棋盤 PNG 演算法

將圖片轉換成「西洋棋盤狀」的半透明 PNG——奇數格完全透明、偶數格保留色彩。這是繞過 X 平台圖片再壓縮機制（限制 1MB）的技巧，讓上傳的圖在 1MB 以內仍保有不錯的畫質。

### 為什麼縮圖後會「消失」

顯示 PNG 時，每個像素會依 Alpha 值與背景色合成：

$$C_{display} = \alpha \cdot C_{pixel} + (1 - \alpha) \cdot C_{bg}$$

原尺寸檢視時，每個不透明像素都完整顯示，人眼把交錯的色點拼成完整圖片；平台縮圖時會把相鄰像素平均，透明像素帶進來的是背景色，縮圖顏色被往背景色拉近，看起來被沖淡、模糊甚至消失。

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
- 選擇演算法：優化解 (Analytical) 或暴力解 (Brute Force)
- 即時預覽處理結果
- 下載處理後的圖片

---

## 支援的平台

目前針對 **X (Twitter)** 產生圖片：輸出 RGBA PNG，並控制在 X 的 1MB PNG 限制內，避免被平台再壓縮成 JPEG 而失去透明度。詳見 [平台設定](docs/platforms.md)。

---

## 技術架構

### 技術棧

- **前端框架**: React 19 with TypeScript (strict mode)
- **建構工具**: Vite
- **圖片處理**: 原生 Canvas API + UPNG.js
- **樣式**: Tailwind CSS + daisyUI (Nord 暗色主題)
- **動畫**: Framer Motion
- **路由**: React Router v7

### 專案結構

```
src/
├── components/          # React 元件
│   ├── Navigation/      # 導航元件
│   └── FloatingButtons/ # 主題切換 + 回到頂部
├── lib/                 # 演算法核心函式庫
│   ├── xProcessor.ts           # 西洋棋盤 PNG 主流程（優化解）
│   ├── bruteForceXProcessor.ts # 西洋棋盤 PNG 暴力解
│   ├── animatedXProcessor.ts   # 演算法演示用的逐步處理器
│   ├── imageUtils.ts           # 圖片工具函式
│   └── types.ts                # 類型定義
├── pages/               # 頁面元件
│   ├── Comparison.tsx    # 對比展示
│   ├── AlgorithmDemo.tsx # 演算法演示
│   ├── Explanation.tsx   # 演算法說明
│   └── Playground.tsx    # 互動實驗區
├── hooks/               # React Hooks
│   ├── useXProcessor.ts
│   └── useBruteForceProcessor.ts
├── utils/
│   └── validation.ts    # 輸入驗證
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

#### 3. 參數搜尋：優化解 vs 暴力解

兩者都在找「顏色數 × 解析度」中第一個能讓 PNG ≤ 1MB 的組合：

| 維度 | 優化解 (Analytical) | 暴力解 (Brute Force) |
|------|---------------------|----------------------|
| 搜尋方式 | 貪婪式：32→16→8→4→2 色，不行再每次縮小 10% 解析度 | 窮舉 8 種 scale × 5 種顏色數，共 40 種組合 |
| PNG 編碼次數 | 1 ~ 11 次 | 固定 40 次 |
| 結果 | 第一個合格的組合 | 依相同優先順序挑選，結果幾乎一致 |
| 結論 | 實際使用 | 用於展示完整搜尋過程 |

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

## 應用場景

- **數位迷因創作**：在社群媒體上製作「點開有驚喜」的互動圖片
- **視覺藝術探索**：研究人眼如何把交錯的像素拼成完整影像
- **平台相容性研究**：理解不同平台如何處理上傳的圖片

---

## 技術挑戰

1. **檔案大小限制**：X 平台的 PNG 限制為 1MB，需要透過色彩量化與棋盤格化壓低檔案大小
2. **畫質與大小的取捨**：顏色數越少、解析度越低，檔案越小但畫質越差，需要找出最佳組合
3. **透明度保留**：平台一旦把圖片轉成 JPEG，Alpha 通道就會消失，棋盤格效果也隨之失效

---

## 評估指標

- **檔案大小**：必須 ≤ 1MB
- **處理時間**：演算法演示頁會顯示兩種方法的毫秒數
- **顏色數 / 縮放比例**：越高代表保留的畫質越好

---

## 警告

本專案僅供學術研究與技術交流。請勿利用此技術傳播違反社群準則之內容。

---

## 致謝

- 靈感來源：與朋友在 X 平台上看到的一張視覺魔術圖片
- 色彩量化：Median-cut (Heckbert, 1982)

---

##  License

MIT