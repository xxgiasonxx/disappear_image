Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
# 縮放之下的消失點 (The Vanishing Point Under Scaling)

「我看得到你，但我看不見你。」

本專案使用 React + TypeScript 構建前端網站，探索數位影像處理中的「抗重採樣隱寫術」(Anti-Downsampling Steganography)，利用社群平台縮圖演算法的漏洞，達成預覽圖與原始圖的資訊落差。

---

## 一、研究動機與目的

### 1.1 研究背景

在現今社群平台（如 Instagram、Facebook、LINE）盛行的時代，圖片在傳輸過程中不可避免地會經過伺服器端的「二次處理」，其中最核心的操作就是重採樣縮放（Resampling / Resizing）。當使用者將一張 2000×2000 像素的圖片上傳至社群平台後，平台往往會自動將其壓縮為 500×500 甚至更小的解析度，以節省頻寬與儲存空間，且更好展現在行動裝置上。

這個想法起源於與朋友在風和日麗的一天吃晚餐的過程中，他滑著滑著看到了一篇 X（前身 Twitter）的貼文，裡面的圖像上寫著「TAP」，點開後可以看到想讓粉絲看到的圖像；反而在縮小後的圖像上只剩下「TAP」示意著讓你點擊。認真觀看後發現好像是使用像素點來保證效果，進而開始研究本專案。

因此本研究的動機在於探索主流社群平台縮放演算法的邊界，尋找一種能將資訊「結構化」嵌入像素分布中的方法，使其在縮放過後想消失的地方消失，能讓以預定的目標圖像精準浮現在原圖中。

### 1.2 研究目的

- 研究各大社群平台縮圖機制
- 嘗試開發一種基於「縮放陷阱（Rescaling Trap）」技術的圖像編碼演算法
- 讓目標圖像（Secret Image）能夠在經歷特定演算法縮放後，精準消失在縮圖當中
- 實現一種具備「魯棒性」的縮放技術，使其能抵抗社群平台的自動化壓縮流程
- 讓大家都可以使用網站馬上使用，並理解社群平台背後的優化方案

---

## 二、縮放演算法

要理解「縮放陷阱」的核心機制，必須先深入了解縮放演算法的數學本質。當社群平台將圖片從 2000×2000 縮小到 500×500 時，它並非隨機丟棄像素，而是透過一個卷積核（Kernel）對原圖進行加權平均。

### 2.1 最近鄰插值（Nearest Neighbor Interpolation）

最近鄰插值是最簡單的縮放方法，對於縮放後圖像中的每一個像素位置，它直接選取原圖中距離最近的單一像素值，不進行任何加權計算。

**特性分析：**
- 採樣點：每個輸出像素僅對應 1 個原圖像素（1×1 感受野）
- 計算複雜度：O(W' × H')，最低
- 適用場景：常用在放大，縮小反而很少因為表現糟糕，對畫素藝術（Pixel Art）或對運算效能要求極高的即時預覽
- 縮放陷阱可利用性：**極高**（採樣點完全確定性，可精準控制）
- 優點：運算極快，不改變原始色彩
- 缺點：會產生明顯的「馬賽克」效應，縮圖後邊緣會有明顯的鋸齒狀（Aliasing），影像顯得粗糙

### 2.2 雙線性插值（Bilinear Interpolation）

雙線性插值在水平與垂直兩個方向上分別進行線性插值，利用原圖中 2×2 = 4 個相鄰像素進行加權平均，是目前社群平台最常用的縮放方式之一（兼顧速度與品質）。

**特性分析：**
- 感受野：2×2（4 個像素參與計算）
- 計算複雜度：O(W' × H' × 4)，線性
- 縮放陷阱可利用性：**高**（加權係數可預測，允許逆向設計）
- 適用場景：一般網頁縮圖、影片即時縮放
- 優點：處理後的過渡比最近鄰平滑，速度適中
- 缺點：縮圖後影像會顯得有些模糊，且容易遺失細小的高頻細節

### 2.3 雙三次插值（Bicubic Interpolation）

雙三次插值利用原圖中 4×4 = 16 個相鄰像素，透過三次多項式（Cubic Polynomial）進行插值，是品質最高的主流縮放演算法，被 Photoshop 和大多數高品質圖像處理庫採用。

**特性分析：**
- 感受野：4×4（16 個像素參與計算）
- 計算複雜度：O(W' × H' × 16)
- 縮放陷阱可利用性：**中**（係數複雜但完全確定，可利用逆向最佳化）
- 優點：比雙線性更加精細，能夠保留更好的邊緣銳利度與細節
- 缺點：計算量明顯增加；在強烈對比的邊緣可能會產生「光暈」現象

### 2.4 蘭佐斯重取樣（Lanczos Resampling）

基於 Sinc 函數的一種加權方式，通常考慮 4×4 或 6×6 的像素區域。它被認為是傳統重取樣演算法中的頂點。

**特性分析：**
- 感受野：透過振盪補償來減少混疊現象，並在縮小時保持極高的銳利度
- 適用場景：高品質攝影作品縮放、專業印刷前處理
- 優點：細節保留最完整，影像最清晰
- 缺點：計算量最大；在某些情況下會產生環狀紋路

### 2.5 各種演算法的統一比較

| 項目 | 最近鄰 | 雙線性 | 雙三次 | 蘭佐斯 |
|------|--------|--------|--------|--------|
| 感受野大小 | 1×1 | 2×2 | 4×4 | 4×4 or 6×6 |
| 參與計算像素數 | 1 | 4 | 16 | 16 或 36 |
| 數學本質 | 直接映射 | 線性加權 | 三次多項式 | Sinc 函數加窗 |
| 計算複雜度 | O(N) | O(4N) | O(16N) | O(16N) ~ O(36N) |
| 圖像品質 | 低（馬賽克） | 中（平滑） | 高（銳利） | 極高（細節最完整） |
| 縮放陷阱利用難度 | 易（確定性最高） | 中（線性係數） | 難（多項式係數） | 難（振盪函數係數） |
| 採樣點預測性 | 100% 確定 | 完全確定 | 完全確定 | 完全確定 |
| 反向求解難度 | 極低 | 中 | 高 | 高 |

---

## 三、核心問題定義

### 3.1 問題形式化

本研究將問題形式化為以下最佳化問題：

**輸入：**
- S：背景圖（Cover Image），解析度 W×H，如 2000×2000
- T：目標圖（Secret Image），解析度 W'×H'，如 500×500
- f：縮放函數，以特定插值核 K 定義

**輸出：**
- A：攻擊圖（Attack Image），解析度同 S（2000×2000）

### 3.2 核心問題

**問題 1：利用確定性採樣漏洞**

主流縮放演算法（Bilinear, Bicubic）的採樣點和加權係數是可能可預測的，對於給定的縮放比例，每個輸出像素對應哪些輸入像素、各自的權重為何，均可事先精準計算。本研究將利用這個「確定性採樣漏洞」，透過反向設計像素排布，將「顯現」轉化為「消失」。

**問題 2：社群平台自動壓縮的規避**

社群平台通常會對上傳圖像施加 JPEG 壓縮（品質係數 70-85），JPEG 的 8×8 DCT 區塊壓縮會引入量化誤差，進一步破壞精心設計的像素排布。本研究透過在優化過程中加入 JPEG 壓縮模擬層，強迫演算法學習對壓縮具有魯棒性的像素排布策略。

---

## 四、實作規劃

### 4.1 開發工具選擇

希望以網頁前端達到目的，沒有後端是因為資安問題，所有圖片皆在使用者瀏覽器上做演算法計算，再來是很適合展示最終成果，可以通過動畫對比比較與暴力解的處理速度以及各項結果。

| 語言/框架 | 優點 | 適用情境 |
|-----------|------|----------|
| TypeScript | 有強型別的 JavaScript，能更好避免意料之外的錯誤 | 演算法開發與概念驗證，動畫與網頁頁面呈現 |
| React | 讓實作互動式的使用者介面變得一點也不痛苦 | 網頁實現的框架，能更快更穩定的實現專案 |
| Tailwind CSS | 更方便的 CSS 能直接在 class 中實作 CSS 設定 | 增加開發效率 |
| daisyUI | 快速的 UI 版面，一些常用的東西可以不用直接實作 | 增加開發效率 |

### 4.2 專案技術棧

- **前端框架**: React 18+ with TypeScript (strict mode)
- **建構工具**: Vite
- **圖片處理**: 原生 Canvas API + Web Workers (避免阻塞主執行緒)
- **狀態管理**: React Context + useReducer (或 Zustand)
- **樣式**: Tailwind CSS + daisyUI (自訂暗色主題)
- **部署**: 靜態網站托管

### 4.3 頁面製作

#### 頁面一：Comparison (對比展示)

功能：
- 左側展示原始圖片，右側展示處理後的圖片
- 中間有一條可拖動的分隔線，使用者可拖動查看兩圖差異


#### 頁面二：Algorithm Demo (演算法演示)

功能：
- 展示暴力解 vs 優化解的比較
- 需要有動畫效果展示運算過程
- 顯示兩種方法的處理時間差異


#### 頁面三：Explanation (演算法說明)

功能：
- 使用視覺化方式解說虛擬碼運作原理
- 逐步展示演算法流程
- 支援動畫播放控制

#### 頁面四：Playground (互動實驗區)

功能：
- 使用者圖片上傳區域
- 選擇目標平台的縮圖尺寸 (Discord, Line, X 等)
- 即時預覽處理結果
- 下載處理後的圖片

### 4.4 演算法實作規劃

#### 1. 暴力搜尋法 (Brute Force Approach)

- **邏輯**：遍歷高解析度圖片中的每一個像素點，在每一個點的 (0, 255) 範圍內進行迭代搜尋
- **策略**：對於每個受縮放演算法影響的採樣區塊（例如 4×4 區塊縮放為 1×1 像素），暴力嘗試所有像素組合，直到縮放後的像素值與目標（黑或白）的誤差最小
- **複雜度**：O(N · K^P)，其中 P 是每個區塊內的像素數。這在計算上是不可行的，因此實作時通常會退化為「局部貪婪搜尋」，這也是暴力解效率低下的主因

#### 2. 優化代數解 (Optimized Algorithmic Solution)

- **邏輯**：將縮放視為一個線性變換矩陣
- **策略**：假設縮放運算為 W · x = y，其中 W 是權重卷積矩陣，x 是原始圖像向量，y 是目標圖像（全黑/全白），我們不需逐一嘗試，而是直接求解這個超定或欠定方程組
- **演算法**：使用共軛梯度法 (Conjugate Gradient) 或最小二乘法 (Least Squares)，透過計算梯度 ∇f 快速找到讓 MSE 最小化的像素擺放方式
- **複雜度**：O(k · N log N)（若使用 FFT 加速）或矩陣運算的線性時間，效能將遠超暴力解

### 4.5 效能評估指標

#### 1. 目標達成精度

透過計算縮放後的圖片與空白底圖（全黑或全白）之間的透過像素點計算均方誤差（Mean Squared Error）：

- **指標意義**：MSE 越趨近於 0，代表圖片縮放後「消失」得越徹底，成功轉化為底圖顏色
- **對比實驗**：分別計算「暴力解」與「優化解」在相同迭代次數下的 MSE 下降曲線

#### 2. 計算效率

- **時間複雜度**: 紀錄從原始圖生成攻擊圖所需的總時間（秒）
- **收斂速度**: 達到目標 MSE 閾值（例如 MSE < 10）所需的迭代次數
- **資源佔用**: 紀錄暴力解與優化解的記憶體峰值

#### 3. 視覺隱蔽性 (Visual Fidelity - PSNR/SSIM)

雖然目標是讓子圖變黑/白，但「原圖」必須看起來正常

- **PSNR (峰值信噪比)**: 衡量原圖與修改後的攻擊圖之間的差異
- **指標要求**：PSNR 通常需大於 30dB，肉眼才難以察覺異常像素的擺放

---

## 五、預期成果與研究價值

### 5.1 技術成果

- 一個能在各種主流縮放演算法上運作的縮放陷阱生成器
- 完整的損失函數設計調整指南
- JPEG 壓縮（品質 70）下，縮放後目標圖仍可識別（PSNR 通常需大於 30dB）

### 5.2 實用價值

本研究不僅具有學術探索價值，也具有重要的資安實踐意義，其成果可應用於：
- **反制攻擊（Counter-Attack Detection）**：識別惡意使用縮放攻擊的圖像
- **平台安全研究**：促使社群平台改進其縮放演算法，降低遭受此類攻擊的風險
- **公眾教育**：讓大家知道社群平台或各個平台怎麼運作的，也能讓你知道你的圖片不見得跟你見到的相同

---

## 安裝方式 (Tailwind CSS v3 + daisyUI v4)

```bash
# 建立 Vite 專案
npm create vite@latest ./ -- --template react-ts

# 安裝 Tailwind CSS v3 和 daisyUI v4（v5 有相容性問題）
npm install tailwindcss@3 postcss autoprefix daisyui@4
```

### postcss.config.js

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'nord-dark': '#2E3440',
        'nord-blue': '#3B4252',
        'nord-ice': '#88C0D0',
        'nord-sand': '#EBCB8B',
        'nord-snow': '#ECEFF4',
      },
    },
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        nord: {
          "primary": "#88C0D0",
          "primary-content": "#2E3440",
          "secondary": "#EBCB8B",
          "secondary-content": "#2E3440",
          "accent": "#5E81AC",
          "accent-content": "#ECEFF4",
          "neutral": "#3B4252",
          "neutral-content": "#ECEFF4",
          "base-100": "#2E3440",
          "base-200": "#3B4252",
          "base-300": "#434C5E",
          "base-content": "#ECEFF4",
          "info": "#88C0D0",
          "info-content": "#2E3440",
          "success": "#A3BE8C",
          "success-content": "#2E3440",
          "warning": "#EBCB8B",
          "warning-content": "#2E3440",
          "error": "#BF616A",
          "error-content": "#2E3440",
        },
      },
    ],
  },
}
```

### src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  background-color: #2E3440;
}

body {
  background: repeating-conic-gradient(
    from 0deg at 50% 50%,
    #3B4252 0deg 1deg,
    #2E3440 1deg 2deg
  );
  background-size: 2px 2px;
  min-height: 100vh;
}
```

### index.html（啟用主題）

```html
<html lang="zh-TW" data-theme="nord">
```

### 色彩調色板 (Color Palette)

```
nord-dark (主背景): #2E3440 (極地深藍灰)
nord-blue (次要背景): #3B4252 (稍微亮的藍灰)
nord-ice (主色): #88C0D0 (冰晶藍，精準感)
nord-sand (強調色): #EBCB8B (暖沙黃，標記隱藏訊息)
nord-snow (文字): #ECEFF4 (近乎白色的淺藍灰)
```

---

## RWD 要求

- 使用 daisyUI 的响应式类名
- 移动优先设计
- 支援 xs (< 640px)、sm (640px)、md (768px)、lg (1024px)、xl (1280px) 断点

---

## 資安要求 (Security Requirements)

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
- 敏感資料勿存入 localStorage (使用 sessionStorage 或記憶體)
- Implement CSP (Content Security Policy) headers

---

## 程式撰寫規範 (Coding Conventions)

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
- 超過此限制需拆分为多个子函数
- 保持单一职责原则 (SRP)

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

### Clean Code 原則
- **DRY (Don't Repeat Yourself)**：重複代碼抽取為共用函數
- **KISS (Keep It Simple, Stupid)**：保持程式碼簡單直接
- **YAGNI (You Aren't Gonna Need It)**：不預先實作未來可能需要的功能
- 每個模組不超過 200 行
- 減少巢狀結構（最多 3 層）

### 註解規範
需要寫註解的情況：
- 複雜的演算法邏輯（說明「為什麼」而非「做什麼」）
- 非直觀的商業邏輯
- 處理邊界條件的原因

不需要寫註解的情況：
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

## 專案結構

```
src/
├── components/          # React 元件
│   ├── Navigation/      # 導航元件
│   └── FloatingButtons/ # 主題切換 + 回到頂部
├── lib/                 # 演算法核心函式庫
│   ├── types.ts         # 類型定義與常數
│   ├── interpolation.ts # 插值演算法 (kernel functions)
│   ├── steganography.ts # 隱寫術演算法
│   ├── xProcessor.ts    # X 平台圖片處理
│   ├── bruteForce.ts    # 暴力搜尋法
│   ├── analytical.ts    # 解析法
│   ├── imageUtils.ts    # 影像工具函式
│   ├── bruteForceXProcessor.ts
│   └── animatedXProcessor.ts
├── pages/               # 頁面元件
│   ├── Comparison.tsx
│   ├── AlgorithmDemo.tsx
│   ├── Explanation.tsx
│   └── Playground.tsx
├── workers/             # Web Workers (圖片處理)
│   └── imageProcessor.worker.ts
├── hooks/               # React hooks
│   ├── useXProcessor.ts
│   └── useBruteForceProcessor.ts
├── utils/               # 工具函式
│   └── validation.ts    # 輸入驗證
└── App.tsx
```

### 路徑別名規範 (Path Aliases)

本專案使用路徑別名，**禁止使用 `../` 或 `../../` 等相對路徑**。所有 import 必須使用以下別名：

| 別名 | 實際路徑 | 使用範例 |
|------|----------|----------|
| `@/*` | `src/*` | `@/App` → `src/App` |
| `@lib/*` | `src/lib/*` | `@lib/types` → `src/lib/types` |
| `@components/*` | `src/components/*` | `@components/Navigation` → `src/components/Navigation` |
| `@pages/*` | `src/pages/*` | `@pages/Comparison` → `src/pages/Comparison` |
| `@utils/*` | `src/utils/*` | `@utils/validation` → `src/utils/validation` |
| `@workers/*` | `src/workers/*` | `@workers/imageProcessor` → `src/workers/imageProcessor` |
| `@hooks/*` | `src/hooks/*` | `@hooks/useXProcessor` → `src/hooks/useXProcessor` |

**正確範例：**
```typescript
import { hideImageAnalytical } from '@lib/steganography';
import { PLATFORM_CONFIGS } from '@lib/types';
import { Navigation } from '@components/Navigation/Navigation';
import { Comparison } from '@pages/Comparison';
```

**錯誤範例：**
```typescript
import { hideImageAnalytical } from '../lib/steganography';      // ❌
import { PLATFORM_CONFIGS } from '../../lib/types';             // ❌
import { Navigation } from '../components/Navigation';           // ❌
```

---

## 專案簡介

當你將一張高解析度圖片上傳到 Discord、Line 或 X 時，平台為了節省頻寬，會使用特定的插值演算法（Interpolation Algorithms）將圖片下採樣（Downsampling）。本專案實作了一種像素級的視覺魔術：我們在原始圖片中植入特定的高頻訊號（High-frequency signals），這些訊號在原始尺寸下清晰可見，但在經過縮放演算法的「平均化」處理後，會完美的與背景融為一體，從預覽圖中徹底消失。

---

## 核心演算法：高頻訊息隱匿 (HF Information Hiding)

影像縮放本質上是像素的重新採樣。常用的演算法如雙線性插值 (Bilinear) 或 雙三次插值 (Bicubic) 會根據權重計算鄰近像素的平均值。我們利用數學公式逆向推導：

$$P_{dst} = \sum_{i=1}^{n} w_i \cdot P_{src,i}$$

其中 $P_{dst}$ 是縮圖後的像素，$w_i$ 是演算法權重。我們透過調整 $P_{src}$ 的極微小差異，讓 $\sum w_i \cdot P_{src,i}$ 的結果趨近於背景色，使秘密訊息在低解析度下成為「統計誤差」。

---

## 深度分析：暴力解 vs. 優化解

| 維度 | 暴力模擬法 (Brute Force) | 逆向解析優化法 (Analytical Inverse) |
|------|-------------------------|-------------------------------------|
| 邏輯 | 不斷隨機生成像素排列，模擬縮放後對比結果 | 直接根據縮放比例與卷積核（Kernel）進行矩陣運算 |
| 時間複雜度 | O(Iteration × N²)，極度耗時 | O(N²)，一次運算即可完成 |
| 隱藏效果 | 邊緣會有明顯的噪點殘影，容易被察覺 | 能夠達到像素級的精準隱身，縮圖看起來完美無瑕 |
| 適應性 | 換一個平台（縮放比例改變）就必須重新訓練 | 透過參數化公式，一秒切換不同平台的縮放模型 |
| 結論 | 不切實際，僅能處理極小尺寸圖片 | 工程首選，適合處理 4K 以上高畫質影像 |

---

## 技術挑戰 (The Hard Part)

這不是簡單的畫畫，要達成「完美隱身」需要克服：

- **插值演算法的多樣性**：不同平台使用的 Kernel 不同（Bilinear vs Lanczos），需要找到交集
- **色彩空間壓縮**：JPEG 的破壞性壓縮（Lossy Compression）會改變像素值，我們必須在演算法中加入誤差補償
- **極致效能要求**：處理千萬級像素的矩陣運算，需使用 Web Workers 確保 UI 順暢

---

## 應用場景

- **數位迷因創作**：在社群媒體上製作「點開有驚喜」的互動圖片
- **脆弱浮水印 (Fragile Watermarking)**：用於檢測圖片是否被未經授權的縮放或裁切
- **視覺藝術探索**：研究人類視覺系統對不同頻率訊號的感知邊界

---

## 警告

本專案僅供學術研究與技術交流。請勿利用此技術傳播違反社群準則之內容。

---

## Lint 與 TypeCheck

```bash
npm run lint       # ESLint
npm run typecheck  # TypeScript 型別檢查
npm run build      # production build
```
