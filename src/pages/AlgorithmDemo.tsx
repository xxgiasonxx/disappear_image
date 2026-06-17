import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { loadImageUrl } from '@lib/imageUtils';
import {
  processImageAnalyticalWithProgress,
  processImageBruteForceWithProgress,
  type ProcessingProgress,
  type ProcessingResult,
} from '@lib/animatedXProcessor';

const EXAMPLE_IMAGES = [
  { name: '範例圖 1', path: '/example2.jpg' },
  { name: '範例圖 2', path: '/example3.jpg' },
];

const ANALYTICAL_STEPS = ['載入圖片', '尺寸調整', '色彩量化', '棋盤格化', 'PNG 編碼', '大小檢查', '完成'];
const BRUTE_FORCE_STEPS = ['載入圖片', '尺寸調整', '枚舉組合', '嘗試組合', '選擇結果', '完成'];
const SCALE_OPTIONS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3];
const COLOR_OPTIONS = [32, 16, 8, 4, 2];

function ProgressGrid({ 
  enumResults, 
  currentIndex 
}: { 
  enumResults: ('pending' | 'pass' | 'fail')[];
  currentIndex: number;
}) {
  return (
    <div className="grid grid-cols-5 md:grid-cols-8 gap-1 md:gap-1.5 p-2 md:p-4 bg-nord-dark rounded-lg justify-center">
      {enumResults.map((status, i) => {
        const isActive = i === currentIndex;
        const isLastPass = status === 'pass' && i === enumResults.findIndex(s => s === 'pass');

        let bgClass = 'bg-nord-blue/30';
        let borderClass = '';

        if (status === 'pass') {
          bgClass = isLastPass ? 'bg-green-500' : 'bg-green-500/50';
        } else if (status === 'fail') {
          bgClass = 'bg-red-500/30';
        }

        if (isActive) {
          borderClass = 'border-2 border-nord-ice animate-pulse';
        }

        return (
          <div
            key={i}
            className={`w-4 h-4 md:w-6 md:h-6 lg:w-8 lg:h-8 rounded ${bgClass} ${borderClass} transition-all duration-200`}
            title={`scale=${SCALE_OPTIONS[Math.floor(i / 5)].toFixed(1)}, colors=${COLOR_OPTIONS[i % 5]}`}
          />
        );
      })}
    </div>
  );
}

function ImagePreviewPanel({ 
  dataUrl, 
  label 
}: { 
  dataUrl: string | null; 
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {dataUrl ? (
        <img 
          src={dataUrl} 
          alt={label} 
          className="max-w-full max-h-64 sm:max-h-80 md:max-h-96 lg:max-h-[28rem] xl:max-h-[32rem] rounded-lg border-2 border-nord-blue object-contain"
        />
      ) : (
        <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[28rem] lg:h-[28rem] xl:w-[32rem] xl:h-[32rem] bg-nord-blue/30 rounded-lg flex items-center justify-center">
          <span className="text-nord-snow/50 text-lg sm:text-xl md:text-2xl">{label}</span>
        </div>
      )}
    </div>
  );
}

function ProcessingPanel({ 
  title, 
  progress,
  steps,
  enumResults,
  enumIndex,
  isBruteForce,
}: { 
  title: string;
  progress: ProcessingProgress | null;
  steps: string[];
  enumResults: ('pending' | 'pass' | 'fail')[];
  enumIndex: number;
  isBruteForce: boolean;
}) {
  const currentStepIndex = progress ? Math.min(progress.currentStep, steps.length - 1) : 0;
  const currentStepName = progress ? progress.stepName : steps[0];

  return (
    <div className="bg-nord-dark/50 rounded-xl p-3 sm:p-4 md:p-6">
      <h3 className={`text-lg sm:text-xl md:text-2xl font-bold mb-2 md:mb-4 text-center ${isBruteForce ? 'text-nord-sand' : 'text-nord-ice'}`}>
        {title}
      </h3>
      
      <div className="mb-3 md:mb-4">
        <div className="flex justify-between text-sm sm:text-base mb-1 md:mb-2">
          <span className="text-nord-snow font-medium">{currentStepName}</span>
          <span className="text-nord-ice font-mono text-sm sm:text-base md:text-lg">{Math.round(progress?.progress ?? 0)}%</span>
        </div>
        <div className="h-1.5 md:h-2 bg-nord-blue/30 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-nord-ice" 
            animate={{ width: `${progress?.progress ?? 0}%` }}
          />
        </div>
        <div className="flex gap-1 md:gap-2 text-xs md:text-sm text-nord-snow/60 mt-2 md:mt-3 flex-wrap">
          {steps.map((step, i) => (
            <div
              key={i}
              className={`px-1 md:px-1.5 py-0.5 rounded text-xs md:text-sm ${
                i === currentStepIndex ? 'bg-nord-ice/30 text-nord-ice' :
                i < currentStepIndex ? 'bg-nord-sand/20 text-nord-sand' : ''
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>

      {isBruteForce ? (
        <div className="mb-3 md:mb-4">
          <div className="flex justify-center">
            <ProgressGrid enumResults={enumResults} currentIndex={enumIndex} />
          </div>
          {progress && progress.enumIndex >= 0 && (
            <div className="text-center mt-2 md:mt-3 text-xs sm:text-sm md:text-base text-nord-sand font-medium">
              Trying: scale={progress.scale.toFixed(1)}, colors={progress.numColors}
            </div>
          )}
        </div>
      ) : (
        progress && (
          <div className="text-center mb-3 md:mb-4 text-xs sm:text-sm md:text-base text-nord-sand font-medium">
            Colors: {progress.numColors} | Scale: {progress.scale.toFixed(1)}
          </div>
        )
      )}

      <div className="flex justify-center mt-3 md:mt-4">
        <ImagePreviewPanel 
          dataUrl={progress?.processedPixels ?? null} 
          label="Processing..." 
        />
      </div>
    </div>
  );
}

function ResultPanel({ 
  title, 
  result,
  isHighlighted = false,
}: { 
  title: string;
  result: ProcessingResult | null;
  isHighlighted?: boolean;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: result ? 1 : 0.5, y: result ? 0 : 10 }}
      className={`bg-nord-blue/30 rounded-xl p-4 sm:p-6 md:p-8 ${isHighlighted ? 'ring-2 ring-nord-ice' : ''}`}
    >
      <h4 className={`text-lg sm:text-xl font-bold mb-3 sm:mb-4 ${isHighlighted ? 'text-nord-ice' : 'text-nord-sand'}`}>
        {title}
      </h4>
      
      {result ? (
        <div className="space-y-3 sm:space-y-4">
          <ImagePreviewPanel dataUrl={result.previewUrl} label="Result" />
          <div className="text-sm sm:text-base space-y-2">
            <div className="flex justify-between text-nord-snow/80">
              <span>Processing Time:</span>
              <span className="text-nord-ice font-mono">{result.time}ms</span>
            </div>
            <div className="flex justify-between text-nord-snow/80">
              <span>Output Size:</span>
              <span className="text-nord-ice font-mono">{result.width}×{result.height}</span>
            </div>
            <div className="flex justify-between text-nord-snow/80">
              <span>File Size:</span>
              <span className="text-nord-ice font-mono">{result.sizeInMB} MB</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-32 sm:h-48 flex items-center justify-center">
          <span className="text-nord-snow/50 text-sm sm:text-base">Waiting...</span>
        </div>
      )}
    </motion.div>
  );
}

export function AlgorithmDemo() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [speed, setSpeed] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const [analyticalProgress, setAnalyticalProgress] = useState<ProcessingProgress | null>(null);
  const [bruteForceProgress, setBruteForceProgress] = useState<ProcessingProgress | null>(null);
  const [analyticalResult, setAnalyticalResult] = useState<ProcessingResult | null>(null);
  const [bruteForceResult, setBruteForceResult] = useState<ProcessingResult | null>(null);

  const isPausedRef = useRef({ value: false });
  const speedRef = useRef(1);
  const processingRef = useRef<{ analytical: AbortController | null; bruteForce: AbortController | null }>({
    analytical: null,
    bruteForce: null,
  });

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    isPausedRef.current.value = isPaused;
  }, [isPaused]);

  const handleSelectImage = useCallback(async (imagePath: string) => {
    setSelectedImage(imagePath);
    setIsPlaying(true);
    setIsComplete(false);
    setIsPaused(false);
    setAnalyticalProgress(null);
    setBruteForceProgress(null);
    setAnalyticalResult(null);
    setBruteForceResult(null);

    const fullPath = imagePath;
    const imageData = await loadImageUrl(fullPath);
    setOriginalImageUrl(imageData.dataUrl);

    isPausedRef.current.value = false;

    const analyticalAbort = new AbortController();
    const bruteForceAbort = new AbortController();
    processingRef.current = { analytical: analyticalAbort, bruteForce: bruteForceAbort };

    const analyticalPromise = processImageAnalyticalWithProgress(
      fullPath,
      (progress) => {
        setAnalyticalProgress({ ...progress });
      },
      isPausedRef.current,
      speedRef.current
    );

    const bruteForcePromise = processImageBruteForceWithProgress(
      fullPath,
      (progress) => {
        setBruteForceProgress({ ...progress });
      },
      isPausedRef.current,
      speedRef.current
    );

    Promise.all([analyticalPromise, bruteForcePromise]).then(([analyticalRes, bruteForceRes]) => {
      setAnalyticalResult(analyticalRes);
      setBruteForceResult(bruteForceRes);
      setIsComplete(true);
      setIsPlaying(false);
    }).catch((error) => {
      console.error('Processing error:', error);
      setIsPlaying(false);
    });

    return () => {
      analyticalAbort.abort();
      bruteForceAbort.abort();
    };
  }, []);

  const handleReset = useCallback(() => {
    if (processingRef.current.analytical) {
      processingRef.current.analytical.abort();
    }
    if (processingRef.current.bruteForce) {
      processingRef.current.bruteForce.abort();
    }
    setSelectedImage(null);
    setOriginalImageUrl(null);
    setIsPlaying(false);
    setIsComplete(false);
    setIsPaused(false);
    setAnalyticalProgress(null);
    setBruteForceProgress(null);
    setAnalyticalResult(null);
    setBruteForceResult(null);
  }, []);

  const handleTogglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-nord-dark py-6 sm:py-8 md:py-12 px-2 sm:px-4">
      <div className="max-w-8xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8 md:mb-10"
        >
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-nord-snow mb-2 sm:mb-3 md:mb-4">Algorithm Visualization</h1>
          <p className="text-nord-snow/70 text-sm sm:text-base md:text-xl">Understanding how the two processing methods work</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-nord-blue/30 rounded-2xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8"
        >
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 mb-6 sm:mb-8">
            {EXAMPLE_IMAGES.map(img => (
              <button
                key={img.path}
                onClick={() => handleSelectImage(img.path)}
                disabled={isPlaying}
                className={`btn sm:btn-lg ${selectedImage === img.path ? 'btn-primary' : 'btn-ghost'} gap-2`}
              >
                {img.name}
              </button>
            ))}
          </div>

          {selectedImage && (
            <>
{originalImageUrl && (
                <div className="mb-6 sm:mb-8 flex justify-center">
                  <div className="text-center">
                    <span className="text-xs sm:text-sm md:text-base text-nord-snow/60 mb-2 md:mb-3 block">Original Image</span>
                    <img 
                      src={originalImageUrl} 
                      alt="Original" 
                      className="max-w-full max-h-64 sm:max-h-80 md:max-h-96 lg:max-h-[28rem] xl:max-h-[32rem] rounded-lg border-2 border-nord-blue"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
                <ProcessingPanel
                  title="Analytical Method"
                  progress={analyticalProgress}
                  steps={ANALYTICAL_STEPS}
                  enumResults={[]}
                  enumIndex={-1}
                  isBruteForce={false}
                />

                <ProcessingPanel
                  title="Brute Force Method"
                  progress={bruteForceProgress}
                  steps={BRUTE_FORCE_STEPS}
                  enumResults={bruteForceProgress?.enumResults ?? Array(40).fill('pending')}
                  enumIndex={bruteForceProgress?.enumIndex ?? -1}
                  isBruteForce={true}
                />
              </div>

              <div className="flex flex-wrap justify-center items-center gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
                <button
                  onClick={handleTogglePause}
                  className="btn btn-secondary gap-2"
                  disabled={!isPlaying}
                >
                  {isPaused ? (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                      </svg>
                      Resume
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                      </svg>
                      Pause
                    </>
                  )}
                </button>

                <button
                  onClick={handleReset}
                  className="btn btn-ghost text-nord-snow"
                >
                  Reset
                </button>

                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-nord-snow/70 text-xs sm:text-sm">Speed:</span>
                  <input
                    type="range"
                    min="0.1"
                    max="5"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="range range-primary range-xs w-20 sm:w-32"
                  />
                  <span className="text-nord-ice font-mono w-10 sm:w-12 text-xs sm:text-sm">{speed.toFixed(1)}x</span>
                </div>
              </div>

              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mt-8 sm:mt-10"
                >
                  <ResultPanel 
                    title="Analytical Result" 
                    result={analyticalResult}
                    isHighlighted={analyticalResult ? parseFloat(analyticalResult.sizeInMB) <= 1 : false}
                  />
                  <ResultPanel 
                    title="Brute Force Result" 
                    result={bruteForceResult}
                    isHighlighted={bruteForceResult ? parseFloat(bruteForceResult.sizeInMB) <= 1 : false}
                  />
                </motion.div>
              )}
            </>
          )}

          {!selectedImage && (
            <div className="text-center py-10 sm:py-16">
              <p className="text-nord-snow/60 text-sm sm:text-base md:text-lg">Select an image above to start demo</p>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}

export default AlgorithmDemo;
