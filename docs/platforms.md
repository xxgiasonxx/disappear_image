# 平台設定

## 概述

本專案支援多個社群平台的縮圖配置，包括 Discord、 LINE、X (Twitter) 和自訂設定。每個平台都有不同的最大尺寸限制和使用的插值演算法。

## 平台比較

| 平台 | 最大尺寸策略 | 最大尺寸 | Kernel | 預設品質 |
|------|-------------|----------|--------|---------|
| Discord | Bounding Box | 1100×700 | Bicubic | 0.85 |
| LINE | Long Edge | 1200 (edge) | Bilinear | 0.85 |
| X (Twitter) | Long Edge | 2048 (edge) | Bicubic | 0.90 |
| Custom | Bounding Box | 1920×1080 | Lanczos | 1.00 |

## 設定結構

```typescript
interface PlatformConfig {
  name: string;
  strategy: 'bounding-box' | 'long-edge';
  maxWidth?: number;
  maxHeight?: number;
  maxEdge?: number;
  tiers?: Record<string, { label: string; maxEdge: number }>;
  kernel: InterpolationKernel;
  quality: number;
}
```

### 縮放策略

#### Bounding Box（邊界框）

確保圖片在指定的寬度和高度範圍內，保持原始寬高比：

```typescript
const scale = Math.min(
  maxWidth / srcWidth,
  maxHeight / srcHeight
);
```

#### Long Edge（長邊優先）

根據長邊計算縮放比例，確保最長邊不超過限制：

```typescript
const longEdge = Math.max(srcWidth, srcHeight);
const scale = maxEdge / longEdge;
```

---

## Discord

```typescript
{
  name: 'Discord',
  strategy: 'bounding-box',
  maxWidth: 1100,
  maxHeight: 700,
  kernel: 'bicubic',
  quality: 0.85
}
```

**特性：**
- 使用 Bicubic 插值，兼顧速度與品質
- 寬度限制較嚴格（1100px）
- 適合表情包、Memes 分享

---

## LINE

```typescript
{
  name: 'LINE',
  strategy: 'long-edge',
  maxEdge: 1200,
  kernel: 'bilinear',
  quality: 0.85
}
```

**特性：**
- 使用 Bilinear 插值，運算快速
- 長邊限制 1200px（正方形圖片會是 1200×1200）
- 在台灣和日本非常流行

---

## X (Twitter)

```typescript
{
  name: 'X (Twitter)',
  strategy: 'long-edge',
  maxEdge: 2048,
  tiers: {
    small: { label: 'Small', maxEdge: 680 },
    medium: { label: 'Medium', maxEdge: 1200 },
    large: { label: 'Large', maxEdge: 2048 },
  },
  kernel: 'bicubic',
  quality: 0.90
}
```

**特性：**
- 使用 Bicubic 插值，品質較高
- 長邊可達 2048px
- 有多個尺寸層級：
  - Small: 680px（預覽圖）
  - Medium: 1200px
  - Large: 2048px（原始上傳）

### X 平台特殊限制

X 平台對 PNG 檔案有 **1MB 限制**，需要使用西洋棋盤 PNG 演算法來繞過：

1. **色彩量化**：使用 Median-cut 將顏色減少到 32 色或更少
2. **棋盤格化**：將圖片轉換成半透明格式，大幅減少檔案大小
3. **貪婪搜尋**：逐步減少顏色數或解析度直到符合大小限制

---

## Custom（自訂）

```typescript
{
  name: 'Custom',
  strategy: 'bounding-box',
  maxWidth: 1920,
  maxHeight: 1080,
  kernel: 'lanczos',
  quality: 1.0
}
```

**特性：**
- 使用 Lanczos 插值，最高品質
- 可自訂最大尺寸
- 品質參數為 1.0（無壓縮）

---

## 插值核心選擇指南

| 核心 | 適用場景 | 優點 | 缺點 |
|------|----------|------|------|
| **Bilinear** | 速度優先、一般縮圖 | 速度快、計算簡單 | 可能模糊或有鋸齒 |
| **Bicubic** | 平衡速度與品質 | 平滑過渡、細節保留較好 | 計算量較大 |
| **Lanczos** | 最高品質需求 | 銳利度最高、細節最完整 | 運算最慢、可能產生振鈴效應 |

### 社群平台偏好

- **Discord**: Bicubic - 平衡方案
- **LINE**: Bilinear - 速度優先
- **X (Twitter)**: Bicubic - 品質導向

---

## 使用方式

```typescript
import { PLATFORM_CONFIGS } from '@lib/types';

// 取得 Discord 設定
const discordConfig = PLATFORM_CONFIGS['discord'];

// 取得 Twitter 所有層級
const twitterConfig = PLATFORM_CONFIGS['twitter'];
const smallTier = twitterConfig.tiers?.small;
const mediumTier = twitterConfig.tiers?.medium;
const largeTier = twitterConfig.tiers?.large;

// 在 Playground 中選擇平台
const selectedPlatform = 'twitter'; // 或 'discord', 'line', 'custom'
```

---

## 添加新平台

要添加新平台，請修改 `src/lib/types.ts` 中的 `PLATFORM_CONFIGS` 物件：

```typescript
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  // ... 現有平台
  newPlatform: {
    name: 'New Platform',
    strategy: 'long-edge', // 或 'bounding-box'
    maxEdge: 1500,
    kernel: 'bicubic',
    quality: 0.9,
  },
};
```

---

## 計算目標尺寸

使用 `interpolation.ts` 中的 `calculateTargetSize` 函式：

```typescript
import { calculateTargetSize } from '@lib/interpolation';
import { PLATFORM_CONFIGS } from '@lib/types';

const config = PLATFORM_CONFIGS['discord'];
const result = calculateTargetSize(1920, 1080, config);
// result: { width: 1100, height: 618 }
```

---

## 注意事項

1. **長寬比保持**：所有策略都會保持原始圖片的長寬比
2. **只縮小不放大**：如果圖片小於限制，不會進行任何處理
3. **Kernel 影響**：不同的插值核心會產生不同的視覺效果，請根據需求選擇