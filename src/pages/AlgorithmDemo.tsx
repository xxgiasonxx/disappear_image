import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

interface PixelCanvasAnimationProps {
  isPlaying: boolean;
  speed: number;
  onComplete: () => void;
}

interface AnimationStep {
  label: string;
  description: string;
  duration: number;
}

const ANIMATION_STEPS: AnimationStep[] = [
  { label: '01 隨機像素', description: '初始化隨機像素分布', duration: 800 },
  { label: '02 棋盤篩選', description: '根據 (x+y)%2 模式識別候選像素', duration: 600 },
  { label: '03 色彩量化', description: '將候選像素量化至目標色彩區間', duration: 600 },
  { label: '04 透明度動畫', description: '像素漸變為透明，白色背景顯現', duration: 1200 },
  { label: '05 權重計算', description: '根據縮放演算法權重評估候選像素', duration: 600 },
  { label: '06 選擇最優', description: '選擇 MSE 最低的像素組合', duration: 600 },
];

const GRID_SIZE = 16;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

function PixelCanvasAnimation({ isPlaying, speed, onComplete }: PixelCanvasAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [transparentPixels, setTransparentPixels] = useState<Set<string>>(new Set());
  const animationRef = useRef<number | null>(null);
  const stepStartTimeRef = useRef<number>(0);
  const stepRef = useRef(0);
  const speedRef = useRef(1);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const getCheckerboardPattern = useCallback(() => {
    const pattern: boolean[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      pattern[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        pattern[y][x] = (x + y) % 2 === 0;
      }
    }
    return pattern;
  }, []);

  const drawCanvas = useCallback((transparentSet: Set<string>, currentProgress: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const pattern = getCheckerboardPattern();

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const key = `${x},${y}`;
        const isEven = pattern[y][x];

        if (isEven) {
          ctx.fillStyle = '#88C0D0';
        } else {
          ctx.fillStyle = '#5E81AC';
        }

        if (transparentSet.has(key) && currentProgress > 0) {
          ctx.globalAlpha = Math.max(0, 1 - currentProgress);
          ctx.fillStyle = '#ffffff';
        }

        const padding = 1;
        ctx.fillRect(
          x * CELL_SIZE + padding,
          y * CELL_SIZE + padding,
          CELL_SIZE - padding * 2,
          CELL_SIZE - padding * 2
        );
        ctx.globalAlpha = 1;
      }
    }

    ctx.strokeStyle = '#3B4252';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }
  }, [getCheckerboardPattern]);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    stepRef.current = currentStep;
    stepStartTimeRef.current = 0;

    const animate = (timestamp: number) => {
      if (!stepStartTimeRef.current) {
        stepStartTimeRef.current = timestamp;
      }

      const elapsed = timestamp - stepStartTimeRef.current;
      const currentStepData = ANIMATION_STEPS[stepRef.current];
      const adjustedDuration = currentStepData.duration / speedRef.current;

      if (elapsed < adjustedDuration) {
        const newProgress = elapsed / adjustedDuration;
        setProgress(newProgress);

        if (stepRef.current === 3) {
          const pattern = getCheckerboardPattern();
          const newTransparent = new Set<string>();
          for (let y = 0; y < GRID_SIZE; y++) {
            for (let x = 0; x < GRID_SIZE; x++) {
              if (pattern[y][x] && newProgress > 0.3) {
                newTransparent.add(`${x},${y}`);
              }
            }
          }
          setTransparentPixels(newTransparent);
          drawCanvas(newTransparent, newProgress);
        } else {
          drawCanvas(transparentPixels, 0);
        }

        animationRef.current = requestAnimationFrame(animate);
      } else {
        if (stepRef.current < ANIMATION_STEPS.length - 1) {
          setCurrentStep(prev => prev + 1);
          stepRef.current = stepRef.current + 1;
          stepStartTimeRef.current = 0;
          setProgress(0);
          drawCanvas(transparentPixels, 0);
          animationRef.current = requestAnimationFrame(animate);
        } else {
          onCompleteRef.current();
        }
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentStep, getCheckerboardPattern, drawCanvas, transparentPixels]);

  useEffect(() => {
    drawCanvas(transparentPixels, progress);
  }, [drawCanvas, transparentPixels, progress]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="border-4 border-nord-blue rounded-lg shadow-xl"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="absolute -top-12 left-0 right-0 text-center">
          <span className="text-2xl font-bold text-nord-snow bg-nord-dark/80 px-4 py-1 rounded">
            {ANIMATION_STEPS[currentStep].label}
          </span>
        </div>
      </div>

      <div className="w-full max-w-xl">
        <div className="flex justify-between text-sm text-nord-snow/80 mb-2">
          <span>{ANIMATION_STEPS[currentStep].description}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-2 bg-nord-dark rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-nord-ice"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      </div>

      <div className="flex gap-4 text-sm text-nord-snow/60">
        {ANIMATION_STEPS.map((step, index) => (
          <div
            key={index}
            className={`px-2 py-1 rounded ${
              index === currentStep
                ? 'bg-nord-ice/30 text-nord-ice'
                : index < currentStep
                ? 'bg-nord-sand/20 text-nord-sand'
                : ''
            }`}
          >
            {step.label.split(' ')[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AlgorithmDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isComplete, setIsComplete] = useState(false);

  const handleComplete = useCallback(() => {
    setIsPlaying(false);
    setIsComplete(true);
  }, []);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setIsComplete(false);
  }, []);

  const handlePlay = useCallback(() => {
    if (isComplete) {
      handleReset();
      setTimeout(() => setIsPlaying(true), 100);
    } else {
      setIsPlaying(true);
    }
  }, [isComplete, handleReset]);

  return (
    <div className="min-h-screen bg-nord-dark py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold text-nord-snow mb-4">
            演算法視覺化演示
          </h1>
          <p className="text-nord-snow/70 text-lg">
            深入了解像素級攻擊如何利用縮放演算法漏洞
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-nord-blue/30 rounded-2xl p-8 mb-8"
        >
          <PixelCanvasAnimation
            isPlaying={isPlaying}
            speed={speed}
            onComplete={handleComplete}
          />

          <div className="flex justify-center items-center gap-6 mt-8">
            <button
              onClick={handlePlay}
              className="btn btn-primary gap-2"
              disabled={isPlaying}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
              {isComplete ? '重新播放' : isPlaying ? '播放中...' : '播放'}
            </button>

            <button
              onClick={handleReset}
              className="btn btn-ghost text-nord-snow"
            >
              重置
            </button>

            <div className="flex items-center gap-3">
              <span className="text-nord-snow/70 text-sm">速度:</span>
              <input
                type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={speed}
                onChange={(e) => setSpeed(parseFloat(e.target.value))}
                className="range range-primary range-xs w-32"
              />
              <span className="text-nord-ice font-mono w-12">{speed.toFixed(1)}x</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-2 gap-6"
        >
          <div className="bg-nord-blue/20 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-nord-sand mb-4">
              暴力搜尋法 (Brute Force)
            </h3>
            <ul className="space-y-2 text-nord-snow/80 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-nord-ice">•</span>
                枚舉所有可能的像素組合
              </li>
              <li className="flex items-start gap-2">
                <span className="text-nord-ice">•</span>
                時間複雜度：指數級 O(k^n)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-nord-ice">•</span>
                適合小尺寸影像是 16x16
              </li>
            </ul>
          </div>

          <div className="bg-nord-blue/20 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-nord-sand mb-4">
              解析求解法 (Analytical)
            </h3>
            <ul className="space-y-2 text-nord-snow/80 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-nord-ice">•</span>
                透過矩陣運算直接求解
              </li>
              <li className="flex items-start gap-2">
                <span className="text-nord-ice">•</span>
                時間複雜度：多項式級 O(n²)
              </li>
              <li className="flex items-start gap-2">
                <span className="text-nord-ice">•</span>
                適合任意尺寸影像
              </li>
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-8 bg-nord-blue/10 rounded-xl p-6"
        >
          <h3 className="text-lg font-semibold text-nord-sand mb-4">縮放演算法權重矩陣</h3>
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="text-nord-snow">演算法</th>
                  <th className="text-nord-snow">感受野</th>
                  <th className="text-nord-snow">權重重疊性</th>
                  <th className="text-nord-snow">可預測性</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="text-nord-ice">雙線性</td>
                  <td className="text-nord-snow/80">2×2</td>
                  <td className="text-nord-sand">高</td>
                  <td className="text-green-400">100%</td>
                </tr>
                <tr>
                  <td className="text-nord-ice">雙三次</td>
                  <td className="text-nord-snow/80">4×4</td>
                  <td className="text-nord-sand">中</td>
                  <td className="text-green-400">100%</td>
                </tr>
                <tr>
                  <td className="text-nord-ice">蘭索斯</td>
                  <td className="text-nord-snow/80">6×6</td>
                  <td className="text-nord-sand">低</td>
                  <td className="text-yellow-400">90%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default AlgorithmDemo;
