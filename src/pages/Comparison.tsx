import { useState, useCallback, useRef } from 'react';

interface ComparisonItem {
  id: number;
  original: string;
  processed: string;
  title: string;
}

const comparisons: ComparisonItem[] = [
  {
    id: 1,
    original: '/example2.jpg',
    processed: '/example2_algo.png',
    title: 'Example 1',
  },
  {
    id: 2,
    original: '/example3.jpg',
    processed: '/example3_algo.png',
    title: 'Example 2',
  },
  {
    id: 3,
    original: '/example.jpeg',
    processed: '/example_algo.png',
    title: 'Example 3',
  },
];

function ComparisonSlider({
  original,
  processed,
  label,
}: {
  original: string;
  processed: string;
  label: string;
}) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSliderPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateSliderPosition(e);
  }, [updateSliderPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updateSliderPosition(e);
  }, [isDragging, updateSliderPosition]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateSliderPosition(e);
  }, [updateSliderPosition]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    e.preventDefault();
    updateSliderPosition(e);
  }, [isDragging, updateSliderPosition]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="mb-8 sm:mb-12 last:mb-0">
      <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-nord-snow">{label}</h3>
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-full cursor-ew-resize border-2 border-nord-blue rounded-lg overflow-hidden select-none"
        style={{ aspectRatio: '1', maxWidth: '100%' }}
      >
        <img
          src={processed}
          alt="Processed"
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        {original && (
          <img
            src={original}
            alt="Original"
            className="absolute inset-0 w-full h-full object-cover"
            draggable={false}
            style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
          />
        )}
        {original && (
          <>
            <div
              className="absolute inset-y-0 w-1 bg-white shadow-lg"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-nord-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8L22 12L18 16M6 8L2 12L6 16" />
                </svg>
              </div>
            </div>
            <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-black/60 rounded-lg text-white text-xs sm:text-sm font-medium backdrop-blur-sm">
              Original
            </div>
            <div className="absolute bottom-3 right-3 px-3 py-1.5 bg-black/60 rounded-lg text-white text-xs sm:text-sm font-medium backdrop-blur-sm">
              Processed
            </div>
          </>
        )}
      </div>
      {original && (
        <p className="text-xs sm:text-sm text-nord-snow/50 mt-2 text-center">Drag to compare before/after</p>
      )}
    </div>
  );
}

export function Comparison() {
  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6 sm:mb-8 md:mb-10 text-nord-snow text-center">
        Comparison
      </h1>

      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col gap-6 sm:gap-8">
          {comparisons.map((item) => (
            <ComparisonSlider
              key={item.id}
              original={item.original}
              processed={item.processed}
              label={item.title}
            />
          ))}
        </div>

        <div className="mt-10 sm:mt-12 md:mt-16 p-4 sm:p-6 bg-nord-blue/30 rounded-xl border border-nord-blue/50">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2 sm:mb-3 text-nord-ice">
            使用方式
          </h2>
          <p className="text-sm sm:text-base text-nord-snow/70 leading-relaxed">
            按住圖片並左右拖動來比較處理前後的差異。
            拉桿左側顯示原始圖片，右側顯示處理後的結果。
            注意隱藏的圖案只有在觀看原始高解析度時才能看到。
          </p>
        </div>
      </div>
    </div>
  );
}
