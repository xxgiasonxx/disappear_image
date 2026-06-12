import { useState, useCallback, useEffect, useRef } from 'react';

interface Step {
  title: string;
  description: string;
  code?: string;
}

const steps: Step[] = [
  {
    title: '1. 輸入與初始化',
    description: '載入載體圖片和秘密圖片，設定目標平台的縮圖尺寸與插值演算法',
    code: `function hideImageAnalytical(
  carrierPixels, carrierWidth, carrierHeight,
  secretPixels, secretWidth, secretHeight,
  targetWidth, targetHeight, kernel
) {
  const outputPixels = new Uint8ClampedArray(carrierPixels);

  const carrierScaleX = carrierWidth / targetWidth;
  const carrierScaleY = carrierHeight / targetHeight;
  const sampleRadius = getSampleRadius(kernel, carrierScaleX, carrierScaleY);
  const kernelFn = getKernelFunction(kernel);

  // ... 遍歷每個目標像素
  return { success: true, pixels: outputPixels };
}`,
  },
  {
    title: '2. 計算秘密圖位置',
    description: '根據長寬比計算秘密圖在載體中的縮放比例和偏移量，確保比例正確',
    code: `const secretAspect = secretWidth / secretHeight;
const carrierAspect = carrierWidth / carrierHeight;

if (secretAspect > carrierAspect) {
  sW = carrierWidth;
  sH = carrierWidth / secretAspect;
  offsetX = 0;
  offsetY = (carrierHeight - sH) / 2;
} else {
  sH = carrierHeight;
  sW = carrierHeight * secretAspect;
  offsetX = (carrierWidth - sW) / 2;
  offsetY = 0;
}

const scaleX = sW / secretWidth;
const scaleY = sH / secretHeight;`,
  },
  {
    title: '3. 遍歷目標像素與採樣',
    description: '對每個目標縮圖像素，收集周圍的採樣點及其 kernel 權重',
    code: `for (let dy = 0; dy < targetHeight; dy++) {
  for (let dx = 0; dx < targetWidth; dx++) {
    const srcX = dx * carrierScaleX;
    const srcY = dy * carrierScaleY;

    // 收集周圍採樣點
    const samples = [];
    for (let py = startY; py <= startY + sampleRadius * 2; py++) {
      for (let px = startX; px <= startX + sampleRadius * 2; px++) {
        const distX = Math.abs(px - srcX);
        const distY = Math.abs(py - srcY);
        const weight = kernelFn(distX) * kernelFn(distY);
        samples.push({ px, py, weight });
      }
    }

    const isLight = getSecretPixelLight(secX, secY);
    const targetVal = isLight ? bgValue : 1 - bgValue;
  }
}`,
  },
  {
    title: '4. 建構線性系統',
    description: '根據採樣權重建構 Ax = b 線性系統，其中 b 是目標殘差',
    code: `const blockSize = Math.ceil(sampleRadius * 2);
const n = blockSize * blockSize;

// A[s][blockIdx] = sample[s].weight
const kernelWeights = samples.map(() => new Array(n).fill(0));
const targetValues = [];

for (let blockIdx = 0; blockIdx < n; blockIdx++) {
  for (let s = 0; s < samples.length; s++) {
    kernelWeights[s][blockIdx] = samples[s].weight;
  }
  // 目標殘差：希望縮圖後達到的值與 128 的差
  targetValues.push((targetVal - 128) * strength);
}`,
  },
  {
    title: '5. 求解線性系統（最小二乘法）',
    description: '使用共軛梯度法求解 Ax = b，得到每個採樣點的最佳調整值',
    code: `function solveLeastSquares(A, b, n) {
  const m = A.length;
  const solution = new Array(m).fill(0);
  const tolerance = 1e-10;
  const maxIterations = 100;

  for (let iter = 0; iter < maxIterations; iter++) {
    // 計算殘差 r = b - Ax
    const residual = [];
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < m; j++) {
        sum += A[j][i] * solution[j];
      }
      residual.push(b[i] - sum);
    }

    const rTr = residual.reduce((s, r) => s + r * r, 0);
    if (rTr < tolerance) break;

    // ... 共軛梯度疊代
  }
  return solution;
}

// 求解得到每個採樣點的調整量
const adjustments = solveLeastSquares(kernelWeights, targetValues, n);`,
  },
  {
    title: '6. 應用調整值',
    description: '將計算出的調整值應用到相應的像素，direction 決定增加或減少',
    code: `const direction = isLight ? 1 : -1;

for (let s = 0; s < samples.length; s++) {
  const { px, py } = samples[s];
  const pIdx = (py * carrierWidth + px) * 4;

  const adjust = adjustments[s] * direction * strength;

  outputPixels[pIdx] = clamp(outputPixels[pIdx] + adjust);
  outputPixels[pIdx + 1] = clamp(outputPixels[pIdx + 1] + adjust);
  outputPixels[pIdx + 2] = clamp(outputPixels[pIdx + 2] + adjust);
}

return { success: true, pixels: outputPixels, width: carrierWidth, height: carrierHeight };`,
  },
];

export function Explanation() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1500);

  const intervalRef = useRef<number | null>(null);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => (prev + 1) % steps.length);
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => (prev - 1 + steps.length) % steps.length);
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setCurrentStep((prev) => (prev + 1) % steps.length);
      }, animationSpeed);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, animationSpeed]);

  const goToStep = useCallback((index: number) => {
    setCurrentStep(index);
    if (isPlaying) setIsPlaying(false);
  }, [isPlaying]);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center text-base-content mb-2">
          演算法說明
        </h1>
        <p className="text-center text-base-content/70 mb-8">
          了解如何將秘密圖片藏入載體圖片中
        </p>

        <div className="max-w-4xl mx-auto">
          <div className="bg-base-200 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-base-content">
                {steps[currentStep].title}
              </h2>

              <div className="flex gap-2">
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={prevStep}
                  aria-label="上一步"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  className={`btn btn-sm ${isPlaying ? 'btn-error' : 'btn-primary'}`}
                  onClick={togglePlay}
                >
                  {isPlaying ? '暫停' : '播放'}
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={nextStep}
                  aria-label="下一步"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            <p className="text-base-content/70 mb-4">
              {steps[currentStep].description}
            </p>

            {steps[currentStep].code && (
              <div className="bg-base-100 rounded-lg p-4 overflow-x-auto">
                <pre className="text-sm font-mono">
                  <code className="text-primary-light">
                    {steps[currentStep].code}
                  </code>
                </pre>
              </div>
            )}
          </div>

          <div className="bg-base-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-base-content mb-4">步驟進度</h2>

            <div className="flex gap-2 mb-4">
              {steps.map((step, idx) => (
                <button
                  key={idx}
                  className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                    idx === currentStep
                      ? 'bg-primary scale-y-150'
                      : idx < currentStep
                      ? 'bg-success'
                      : 'bg-base-300 hover:bg-base-100'
                  }`}
                  onClick={() => goToStep(idx)}
                  aria-label={step.title}
                />
              ))}
            </div>

            <div className="flex justify-between text-xs text-base-content/50 mb-2">
              <span>步驟 {currentStep + 1} / {steps.length}</span>
              <span>{Math.round(((currentStep + 1) / steps.length) * 100)}% 完成</span>
            </div>

            <div>
              <label className="text-sm text-base-content/70">
                動畫速度: {animationSpeed}ms
              </label>
              <input
                type="range"
                min="200"
                max="3000"
                step="100"
                value={animationSpeed}
                onChange={(e) => setAnimationSpeed(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>
          </div>

          <div className="bg-base-200 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-base-content mb-4">核心原理</h2>

            <div className="space-y-4">
              <div className="bg-base-100 rounded-lg p-4">
                <p className="text-sm text-base-content/70 mb-2">插值縮放的加權平均</p>
                <p className="text-lg font-mono text-base-content">
                  P<sub>dst</sub> = Σ w<sub>i</sub> · P<sub>src,i</sub>
                </p>
              </div>

              <div className="bg-base-100 rounded-lg p-4">
                <p className="text-sm text-base-content/70 mb-2">目標值設定</p>
                <p className="text-sm text-base-content">
                  秘密亮部 → 目標為背景色（白=255 或 黑=0）
                  <br />
                  秘密暗部 → 目標為 1-背景色（即 0 或 255）
                </p>
              </div>

              <div className="bg-base-100 rounded-lg p-4">
                <p className="text-sm text-base-content/70 mb-2">為什麼秘密會消失？</p>
                <p className="text-sm text-base-content">
                  當秘密圖的某個區域經過縮放後，該區域內所有像素的調整值會被加權平均。
                  我們透過最小二乘法計算精確的調整值，使得縮圖後這些調整的平均值趨近於 0，
                  因此秘密區域看起來就像背景色，秘密就「消失」了。
                </p>
              </div>

              <div className="bg-base-100 rounded-lg p-4">
                <p className="text-sm text-base-content/70 mb-2">解析法 vs 暴力法</p>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="font-semibold text-primary">解析法（最小二乘法）</p>
                    <ul className="text-xs text-base-content/70 list-disc list-inside">
                      <li>建構線性系統 Ax = b</li>
                      <li>使用共軛梯度法求解</li>
                      <li>精確解，效率高</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-warning">暴力法（離散搜尋）</p>
                    <ul className="text-xs text-base-content/70 list-disc list-inside">
                      <li>窮舉 9 個候選值</li>
                      <li>選擇誤差最小的</li>
                      <li>近似解，速度慢</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-base-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-base-content mb-4">關鍵公式</h2>

            <div className="space-y-4">
              <div className="bg-base-100 rounded-lg p-4">
                <p className="text-sm text-base-content/70 mb-1">採樣半徑</p>
                <p className="text-lg font-mono text-base-content">
                  sampleRadius = ceil(baseRadius × max(scaleX, scaleY))
                </p>
              </div>

              <div className="bg-base-100 rounded-lg p-4">
                <p className="text-sm text-base-content/70 mb-1">線性系統</p>
                <p className="text-lg font-mono text-base-content">
                  A · x = b
                </p>
                <p className="text-xs text-base-content/50 mt-1">
                  A: 權重矩陣, x: 調整量, b: 目標殘差
                </p>
              </div>

              <div className="bg-base-100 rounded-lg p-4">
                <p className="text-sm text-base-content/70 mb-1">MSE（均方誤差）</p>
                <p className="text-lg font-mono text-base-content">
                  MSE = Σ(P<sub>avg</sub> - P<sub>bg</sub>)² / n
                </p>
                <p className="text-xs text-base-content/50 mt-1">
                  用於衡量處理後的縮圖與背景色的差異（MSE 越低秘密消失越徹底）
                </p>
              </div>

              <div className="bg-base-100 rounded-lg p-4">
                <p className="text-sm text-base-content/70 mb-1">PSNR（峰值信噪比）</p>
                <p className="text-lg font-mono text-base-content">
                  PSNR = 10 · log<sub>10</sub>(MAX² / MSE)
                </p>
                <p className="text-xs text-base-content/50 mt-1">
                  MAX = 255，PSNR 大於 30dB 表示視覺品質良好
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
