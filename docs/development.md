# 開發指南

本指南說明 Disappear Image 專案的開發規範、最佳實踐和技術要求。

---

## 程式碼規範

### 類型定義優先

- 所有模組必須先定義 TypeScript Interface 或 Type，才可使用
- 避免使用 `any`，使用 `unknown` 搭配型別守卫
- 使用 `as const` 確保 readonly 常量

```typescript
interface ImageData {
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
}

type ProcessorStatus = 'idle' | 'processing' | 'done' | 'error';
```

### 函數長度限制

- 每個函數不得超过 **500 行**（含空行與註解）
- 超過此限制需拆分為多個子函數
- 保持單一職責原則 (SRP)

### 命名規範

- 變數名稱必須一眼可理解其用途
- 使用完整的英文單字，避免縮寫（除非是眾所皆知的如 `id`, `url`, `api`）
- 函數以動詞開頭：`createImageData`, `validateFileType`, `processImage`

```typescript
const uploadedImageFile = file; // ✅ 一眼可理解
const ufile = file; // ❌ 需要猜測用途

function calculateAveragePixelBrightness(): number // ✅ 清楚表達用途
function calc(): number // ❌ 過於精簡
```

### 路徑別名

本專案使用路徑別名，**禁止使用相對路徑**：

```typescript
// ✅ 正確
import { hideImageAnalytical } from '@lib/steganography';
import { PixelBackground } from '@components/PixelBackground/PixelBackground';

// ❌ 錯誤
import { hideImageAnalytical } from '../lib/steganography';
import { PixelBackground } from '../components/PixelBackground';
```

---

## Clean Code 原則

### DRY (Don't Repeat Yourself)

重複代碼抽取為共用函數。如果發現自己複製貼上了相同的程式碼，應該重構為獨立函數。

### KISS (Keep It Simple, Stupid)

保持程式碼簡單直接。不要過度工程化，避免不必要的抽象層。

### YAGNI (You Aren't Gonna Need It)

不預先實作未來可能需要的功能。專注於當前需求。

### 其他原則

- 每個模組不超過 200 行
- 減少巢狀結構（最多 3 層）

---

## 註解規範

### 需要寫註解的情況

- 複雜的演算法邏輯（說明「為什麼」而非「做什麼」）
- 非直觀的商業邏輯
- 處理邊界條件的原因

### 不需要寫註解的情況

- 程式碼本身已足夠清晰表達
- 可以透過重構程式碼來替代註解
- 過時的註解（應直接刪除）

```typescript
// XSS 防護：對使用者輸入進行 HTML 轉義
const sanitizedInput = escapeHtml(userInput);

// 使用「為什麼」而非「做什麼」
// ✅ 避免 SQL Injection，因為我們無法預知使用者的輸入格式
// ❌ 對輸入進行轉義
```

---

## 資安要求

### 輸入驗證

- 所有使用者輸入必須進行驗證與 sanitization
- 圖片上傳需驗證檔案類型 (Magic Number)，不可僅依賴副檔名
- 限制上傳檔案大小 (max 10MB)
- 使用 DOMPurify 防止 XSS

### 依賴安全

- 定期執行 `npm audit` 檢查漏洞
- 鎖定依賴版本，使用 `npm ci` 而非 `npm install`
- 避免使用 `eval()` 或 `new Function()`

### 影像處理安全

- 使用 `createImageBitmap()` 而非 `img.src` 設定外部 URL
- 圖片處理在 Web Worker 中進行，防止 CSP 阻擋
- 不將處理後的圖片資料直接插入 innerHTML

### 傳輸安全

- 所有 API 請求使用 HTTPS
- 敏感資料勿存入 localStorage（使用 sessionStorage 或記憶體）
- Implement CSP (Content Security Policy) headers

---

## 測試要求

### 測試覆蓋範圍

- 所有公開 API 函式都應有單元測試
- 核心演算法（插值、隱寫術）需要完整測試
- 邊界條件和錯誤處理需要測試

### 執行測試

```bash
# 執行所有測試
npm run test

# 監聽模式（開發時使用）
npm run test:watch

# 生成覆蓋率報告
npm run test:coverage
```

### 測試檔案位置

```
test/
├── lib/
│   ├── interpolation.test.ts
│   ├── metrics.test.ts
│   ├── solver.test.ts
│   ├── steganography.test.ts
│   ├── types.test.ts
│   ├── validation.test.ts
│   └── imageUtils.test.ts
├── setup.ts
└── index.ts
```

---

## 樣式規範

### Tailwind CSS

使用 Tailwind CSS 進行樣式開發，遵循行動優先 (Mobile-First) 設計原則：

```tsx
// 響應式斷點
// xs: < 640px
// sm: 640px - 767px
// md: 768px - 1023px
// lg: 1024px - 1279px
// xl: >= 1280px

<div className="text-sm sm:text-base md:text-lg lg:text-xl">
  響應式文字
</div>
```

### daisyUI 主題

使用 Nord 暗色主題：

```html
<html lang="zh-TW" data-theme="nord">
```

### 自訂颜色

```javascript
// tailwind.config.js
colors: {
  'nord-dark': '#2E3440',
  'nord-blue': '#3B4252',
  'nord-ice': '#88C0D0',
  'nord-sand': '#EBCB8B',
  'nord-snow': '#ECEFF4',
}
```

---

## 效能優化

### 圖片處理

- 大量像素運算應在 Web Worker 中進行
- 使用 `OffscreenCanvas` 避免阻塞主執行緒
- 對於大圖片，考慮分塊處理

### React 效能

- 使用 `useCallback` 和 `useMemo` 優化回調和計算
- 列表渲染時使用 `key` 屬性
- 避免不必要的重新渲染

### 建構優化

- 使用 Vite 的代碼分割功能
- 對靜態資源進行緩存
- 啟用 gzip/brotli 壓縮

---

## Git 規範

### 提交訊息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

範例：

```
feat(playground): add image upload with drag and drop

- implement drag and drop file upload
- add file type validation
- show preview before processing
```

### 分支命名

- `feature/xxx` - 新功能
- `fix/xxx` - 錯誤修復
- `docs/xxx` - 文件更新
- `refactor/xxx` - 重構

---

## 部署

### Vercel（推薦）

1. 將專案推送到 GitHub
2. 在 Vercel 中 import 專案
3. 自動偵測到 Vite 設定
4. 部署完成

### 其他平台

```bash
# 建構生產版本
npm run build

# 輸出目錄
dist/
```

---

## 疑難排解

### 型別錯誤

```bash
# 檢查 TypeScript 錯誤
npm run typecheck
```

### ESLint 錯誤

```bash
# 檢查程式碼規範
npm run lint

# 自動修復（部分問題）
npm run lint -- --fix
```

### 測試失敗

```bash
# 查看詳細輸出
npm run test -- --verbose
```