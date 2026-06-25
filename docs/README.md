# Disappear Image

「我看得到你，但我看不見你。」

一個探索「抗重採樣隱寫術」(Anti-Downsampling Steganography) 的互動式網站，利用社群平台縮圖演算法的漏洞，達成預覽圖與原始圖的資訊落差。

[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite)](https://vitejs.dev)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)

---

## 線上體驗

前往 [disappear-image.vercel.app](https://disappear-image.vercel.app) 立即體驗。

---

## 研究背景

在現今社群平台（Discord、Instagram、Facebook、LINE、X）盛行的時代，圖片在傳輸過程中不可避免地會經過伺服器端的「二次處理」，其中最核心的操作就是重採樣縮放 (Resampling / Resizing)。

### 靈感來源

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

本專案提供四個主要頁面：

| 頁面 | 路徑 | 說明 |
|------|------|------|
| 對比展示 | `/` | 可拖動分隔線對比原圖與處理後的圖片 |
| 演算法演示 | `/algorithm` | 動畫展示優化解 vs 暴力解的處理過程與時間比較 |
| 演算法說明 | `/explanation` | 視覺化解說演算法流程，支援展開/摺疊細節 |
| 互動實驗區 | `/playground` | 圖片上傳、平台選擇、即時預覽、下載結果 |

---

## 支援的平台

| 平台 | 預設尺寸 | 使用的 Kernel |
|------|----------|---------------|
| Discord | 1100×700 | Bicubic |
| LINE | 1200×1200 (long-edge) | Bilinear |
| X (Twitter) | 2048×2048 (small: 680) | Bicubic |
| Custom | 自定義 | 自定義 |

---

## 快速開始

```bash
# 克隆專案
git clone https://github.com/your-username/disappear_image.git
cd disappear_image

# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

詳細說明請參閱 [安裝指南](installation.md)。

---

## 文件導覽

- [安裝指南](installation.md) - 完整的環境設定與開發指令
- [專案架構](structure.md) - 目錄結構與模組說明
- [演算法詳解](algorithm.md) - Median-cut 量化、棋盤格化、隱寫術原理
- [API 文档](api.md) - 函式 API 與使用範例
- [平台設定](platforms.md) - 各社群平台的縮圖參數
- [開發指南](development.md) - 程式碼規範與最佳實踐

---

## 應用場景

- **數位迷因創作**：在社群媒體上製作「點開有驚喜」的互動圖片
- **脆弱浮水印 (Fragile Watermarking)**：用於檢測圖片是否被未經授權的縮放或裁切
- **視覺藝術探索**：研究人類視覺系統對不同頻率訊號的感知邊界
- **平台相容性研究**：理解不同平台如何處理上傳的圖片

---

## 警告

本專案僅供學術研究與技術交流。請勿利用此技術傳播違反社群準則之內容。

---

## License

MIT