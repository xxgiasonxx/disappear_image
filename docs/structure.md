# 專案架構

## 目錄結構

```
disappear_image/
├── public/                 # 靜態資源
│   ├── example.jpeg        # 範例圖片
│   ├── example2.jpg
│   ├── example2_algo.png
│   └── logo.ico
├── src/
│   ├── components/         # React 元件
│   │   ├── FloatingButtons/   # 主題切換 + 回到頂部
│   │   └── Navigation/        # 導航列
│   ├── hooks/              # React Hooks
│   │   ├── useBruteForceProcessor.ts
│   │   └── useXProcessor.ts
│   ├── lib/                # 演算法核心函式庫
│   │   ├── xProcessor.ts           # 西洋棋盤 PNG 主流程（優化解）
│   │   ├── bruteForceXProcessor.ts # 西洋棋盤 PNG 暴力解
│   │   ├── animatedXProcessor.ts   # 演算法演示用的逐步處理器
│   │   ├── imageUtils.ts           # 圖片載入、轉換、驗證
│   │   ├── types.ts                # 類型定義
│   │   ├── steganography.ts        # 舊版縮放隱寫實驗（網站未使用）
│   │   ├── analytical.ts           # 舊版縮放隱寫實驗（網站未使用）
│   │   ├── bruteForce.ts           # 舊版縮放隱寫實驗（網站未使用）
│   │   └── interpolation.ts        # 舊版縮放隱寫實驗（網站未使用）
│   ├── pages/              # 頁面元件
│   │   ├── AlgorithmDemo.tsx   # 演算法演示頁
│   │   ├── Comparison.tsx      # 對比展示頁
│   │   ├── Explanation.tsx     # 演算法說明頁
│   │   └── Playground.tsx      # 互動實驗區
│   ├── utils/
│   │   └── validation.ts    # 輸入驗證
│   ├── workers/             # Web Workers（網站未使用）
│   │   └── imageProcessor.worker.ts
│   ├── App.tsx              # 應用程式根元件
│   ├── main.tsx             # 入口點
│   └── index.css            # 全域樣式
├── test/                    # 測試檔案
│   ├── lib/
│   ├── setup.ts
│   └── index.ts
├── docs/                    # 文件
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## 模組職責

### lib/ 核心模組

| 檔案 | 職責 |
|------|------|
| `xProcessor.ts` | Median-cut 量化、棋盤格化、尺寸調整與 `processImageForX` 主流程 |
| `bruteForceXProcessor.ts` | 窮舉 40 種參數組合的 `bruteForceXProcess` |
| `animatedXProcessor.ts` | 逐步回報進度的處理器，供演算法演示頁播放動畫 |
| `imageUtils.ts` | 圖片載入、轉換、下載、檔案驗證 |
| `types.ts` | 類型定義 |

`steganography.ts`、`analytical.ts`、`bruteForce.ts`、`interpolation.ts` 與 `workers/` 是早期「縮放插值隱寫」的實驗程式碼，網站目前沒有引用。

### hooks/ 自訂 Hooks

| Hook | 用途 |
|------|------|
| `useXProcessor` | 管理 `processImageForX`（優化解）的處理狀態 |
| `useBruteForceProcessor` | 管理 `bruteForceXProcess`（暴力解）的處理狀態 |

### pages/ 頁面元件

| 頁面 | 路徑 | 說明 |
|------|------|------|
| `Comparison` | `/` | 可拖動分隔線的對比展示 |
| `AlgorithmDemo` | `/algorithm` | 優化解 vs 暴力解的動畫演示 |
| `Explanation` | `/explanation` | 演算法步驟說明 |
| `Playground` | `/playground` | 上傳圖片、選擇演算法、下載結果 |

## 路由架構

使用 React Router v7 進行客戶端路由：

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Comparison />} />
    <Route path="/algorithm" element={<AlgorithmDemo />} />
    <Route path="/explanation" element={<Explanation />} />
    <Route path="/playground" element={<Playground />} />
  </Routes>
</BrowserRouter>
```

## 狀態管理

使用 React 內建的 `useState`：

- 主題切換（`nord` / `nord-light`）在 `App.tsx` 管理
- 圖片處理狀態由 `useXProcessor`、`useBruteForceProcessor` 管理

## 路徑別名

本專案使用路徑別名，**禁止使用相對路徑**：

| 別名 | 實際路徑 | 使用範例 |
|------|----------|----------|
| `@/*` | `src/*` | `@/App` → `src/App` |
| `@lib/*` | `src/lib/*` | `@lib/xProcessor` → `src/lib/xProcessor` |
| `@components/*` | `src/components/*` | `@components/Navigation` |
| `@pages/*` | `src/pages/*` | `@pages/Comparison` |
| `@utils/*` | `src/utils/*` | `@utils/validation` |
| `@workers/*` | `src/workers/*` | `@workers/imageProcessor` |
| `@test/*` | `test/*` | `@test/lib/imageUtils` |

## 主題系統

使用 daisyUI 的自訂 Nord 主題：

```typescript
const themes = [
  {
    nord: {
      "primary": "#88C0D0",
      "secondary": "#EBCB8B",
      "accent": "#5E81AC",
      "neutral": "#3B4252",
      "base-100": "#2E3440",
      // ...
    }
  }
];
```

---

## 下一步

- [演算法詳解](algorithm.md) - 深入了解核心演算法
- [API 文件](api.md) - 函式使用方法
- [平台設定](platforms.md) - X 平台的限制與輸出規格
