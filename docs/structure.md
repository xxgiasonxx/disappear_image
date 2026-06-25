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
│   │   ├── ImageUploader/     # 圖片上傳元件
│   │   ├── Navigation/        # 導航列
│   │   └── PixelBackground/   # 像素背景
│   ├── hooks/              # React Hooks
│   │   ├── useBruteForceProcessor.ts
│   │   ├── useImageProcessor.ts
│   │   └── useXProcessor.ts
│   ├── lib/                # 演算法核心函式庫
│   │   ├── animatedXProcessor.ts  # 動畫處理器
│   │   ├── analytical.ts          # 解析法（預留）
│   │   ├── bruteForce.ts           # 暴力法（預留）
│   │   ├── bruteForceXProcessor.ts # X 平台暴力處理
│   │   ├── exampleGenerator.ts      # 範例產生器
│   │   ├── imageUtils.ts           # 圖片工具函式
│   │   ├── interpolation.ts        # 插值演算法
│   │   ├── metrics.ts              # 評估指標
│   │   ├── solver.ts               # 數值求解器
│   │   ├── steganography.ts        # 隱寫術核心
│   │   ├── types.ts                # 類型定義
│   │   └── xProcessor.ts           # X 平台處理器
│   ├── pages/              # 頁面元件
│   │   ├── AlgorithmDemo.tsx   # 演算法演示頁
│   │   ├── Comparison.tsx      # 對比展示頁
│   │   ├── Explanation.tsx     # 演算法說明頁
│   │   └── Playground.tsx      # 互動實驗區
│   ├── workers/             # Web Workers
│   │   └── imageProcessor.worker.ts
│   ├── App.tsx              # 應用程式根元件
│   ├── main.tsx             # 入口點
│   └── index.css            # 全域樣式
├── test/                    # 測試檔案
│   ├── lib/
│   │   ├── interpolation.test.ts
│   │   ├── metrics.test.ts
│   │   ├── solver.test.ts
│   │   ├── steganography.test.ts
│   │   ├── types.test.ts
│   │   ├── validation.test.ts
│   │   └── imageUtils.test.ts
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
| `types.ts` | 類型定義、常數、平台設定 |
| `interpolation.ts` | 插值核函式 (bilinear, bicubic, lanczos) |
| `steganography.ts` | 隱寫術核心演算法 |
| `xProcessor.ts` | X 平台圖片處理主流程 |
| `animatedXProcessor.ts` | 動畫展示用處理器 |
| `imageUtils.ts` | 圖片載入、轉換、下載工具 |
| `metrics.ts` | MSE、PSNR 等評估指標 |

### hooks/ 自訂 Hooks

| Hook | 用途 |
|------|------|
| `useXProcessor` | 管理 X 平台圖片處理的狀態 |
| `useImageProcessor` | 通用圖片處理狀態管理 |
| `useBruteForceProcessor` | 暴力法處理狀態管理 |

### pages/ 頁面元件

| 頁面 | 路徑 | 說明 |
|------|------|------|
| `Comparison` | `/` | 可拖動分隔線的對比展示 |
| `AlgorithmDemo` | `/algorithm` | 演算法動畫演示 |
| `Explanation` | `/explanation` | 演算法步驟說明 |
| `Playground` | `/playground` | 互動實驗區 |

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

使用 Zustand 進行輕量級狀態管理，主要用於：

- 主題切換 (`nord` / `nord-light`)
- 圖片處理進度
- 使用者偏好設定

## 路徑別名

本專案使用路徑別名，**禁止使用相對路徑**：

| 別名 | 實際路徑 | 使用範例 |
|------|----------|----------|
| `@/*` | `src/*` | `@/App` → `src/App` |
| `@lib/*` | `src/lib/*` | `@lib/types` → `src/lib/types` |
| `@components/*` | `src/components/*` | `@components/Navigation` |
| `@pages/*` | `src/pages/*` | `@pages/Comparison` |
| `@utils/*` | `src/utils/*` | `@utils/validation` |
| `@workers/*` | `src/workers/*` | `@workers/imageProcessor` |
| `@test/*` | `test/*` | `@test/lib/interpolation` |

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
- [API 文档](api.md) - 函式使用方法
- [平台設定](platforms.md) - 各平台參數說明