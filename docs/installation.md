# 安裝指南

本指南說明如何在本機環境設定並執行 Disappear Image 專案。

## 環境需求

- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本
- **現代瀏覽器**: Chrome 90+, Firefox 90+, Safari 15+, Edge 90+

## 安裝步驟

### 1. 克隆專案

```bash
git clone https://github.com/your-username/disappear_image.git
cd disappear_image
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

開發伺服器會在 `http://localhost:5173` 啟動。

## 開發指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 (Vite HMR) |
| `npm run build` | 建構生產版本 |
| `npm run preview` | 預覽生產版本 |
| `npm run typecheck` | TypeScript 型別檢查 |
| `npm run lint` | ESLint 程式碼檢查 |
| `npm run test` | 執行測試 |
| `npm run test:watch` | 監聽模式執行測試 |
| `npm run test:coverage` | 生成測試覆蓋率報告 |

## 建構生產版本

```bash
npm run build
```

建構產物會輸出到 `dist/` 目錄。

## 技術棧

- **前端框架**: React 19.2 with TypeScript (strict mode)
- **建構工具**: Vite 6.0
- **圖片處理**: 原生 Canvas API + UPNG.js
- **樣式**: Tailwind CSS v3 + daisyUI v4
- **動畫**: Framer Motion v12
- **路由**: React Router v7
- **狀態管理**: Zustand v5

## 依賴說明

### 主要依賴

| 套件 | 版本 | 用途 |
|------|------|------|
| react | ^19.2.5 | UI 框架 |
| react-router-dom | ^7.18.0 | 路由管理 |
| framer-motion | ^12.40.0 | 動畫效果 |
| zustand | ^5.0.12 | 狀態管理 |
| upng-js | ^2.1.0 | PNG 編碼/解碼 |
| pako | ^2.1.0 | 資料壓縮 |
| dompurify | ^3.4.1 | XSS 防護 |

### 開發依賴

| 套件 | 用途 |
|------|------|
| typescript ~6.0 | 型別檢查 |
| tailwindcss@3 | 樣式框架 |
| daisyui@4 | UI 元件庫 |
| vite | 建構工具 |
| eslint | 程式碼檢查 |
| vitest | 測試框架 |

## 疑難排解

### 安裝失敗

如果 `npm install` 失敗，嘗試：

```bash
# 清除 npm 快取
npm cache clean --force

# 刪除 node_modules 重新安裝
rm -rf node_modules package-lock.json
npm install
```

### 型別檢查錯誤

確保使用正確的 TypeScript 配置：

```bash
npm run typecheck
```

### 建構失敗

檢查是否有未解决的 ESLint 錯誤：

```bash
npm run lint
```

## 後續步驟

- 閱讀 [專案架構](structure.md) 了解程式碼組織
- 閱讀 [演算法詳解](algorithm.md) 深入理解核心原理
- 參考 [API 文档](api.md) 了解函式用法