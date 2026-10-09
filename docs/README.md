# Disappear Image

「我看得到你，但我看不見你。」

一個探索「Alpha 通道隱寫術」(Alpha Channel Steganography) 的互動式網站，利用 PNG 透明度與社群平台縮圖的特性，達成預覽圖與原始圖的資訊落差。

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

本專案提供四個主要頁面：

| 頁面 | 路徑 | 說明 |
|------|------|------|
| 對比展示 | `/` | 可拖動分隔線對比原圖與處理後的圖片 |
| 演算法演示 | `/algorithm` | 動畫展示優化解 vs 暴力解的處理過程與時間比較 |
| 演算法說明 | `/explanation` | 視覺化解說演算法流程，支援展開/摺疊細節 |
| 互動實驗區 | `/playground` | 圖片上傳、選擇演算法、即時預覽、下載結果 |

---

## 支援的平台

目前針對 **X (Twitter)** 產生圖片：輸出 RGBA PNG，並控制在 X 的 1MB PNG 限制內，避免被平台再壓縮成 JPEG 而失去透明度。詳見 [平台設定](platforms.md)。

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
- [演算法詳解](algorithm.md) - Alpha 通道原理、Median-cut 量化、棋盤格化、參數搜尋
- [API 文件](api.md) - 函式 API 與使用範例
- [平台設定](platforms.md) - X 平台的限制與輸出規格
- [開發指南](development.md) - 程式碼規範與最佳實踐

---

## 應用場景

- **數位迷因創作**：在社群媒體上製作「點開有驚喜」的互動圖片
- **視覺藝術探索**：研究人眼如何把交錯的像素拼成完整影像
- **平台相容性研究**：理解不同平台如何處理上傳的圖片

---

## 警告

本專案僅供學術研究與技術交流。請勿利用此技術傳播違反社群準則之內容。

---

## License

MIT