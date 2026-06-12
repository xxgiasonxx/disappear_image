import { useState, useEffect, useCallback } from 'react';

interface FloatingButtonsProps {
  currentTheme: 'nord' | 'nord-light';
  onThemeToggle: () => void;
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
    </svg>
  );
}

export function FloatingButtons({ currentTheme, onThemeToggle }: FloatingButtonsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const isDarkMode = currentTheme === 'nord';

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (isMobile) {
    return (
      <div className="fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={onThemeToggle}
          className="btn btn-circle btn-sm bg-base-200 text-base-content hover:bg-base-300 shadow-lg"
          aria-label={isDarkMode ? '切換到亮色模式' : '切換到暗色模式'}
        >
          {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
        </button>
        {isVisible && (
          <button
            onClick={scrollToTop}
            className="btn btn-circle btn-sm bg-base-200 text-base-content hover:bg-base-300 shadow-lg"
            aria-label="回到頂部"
          >
            <ArrowUpIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="btn btn-circle btn-lg bg-base-200 text-base-content hover:bg-base-300 shadow-lg transition-all duration-300 hover:scale-110"
          aria-label="回到頂部"
        >
          <ArrowUpIcon className="w-5 h-5" />
        </button>
      )}
      <button
        onClick={onThemeToggle}
        className="btn btn-circle btn-lg bg-base-200 text-base-content hover:bg-base-300 shadow-lg transition-all duration-300 hover:scale-110"
        aria-label={isDarkMode ? '切換到亮色模式' : '切換到暗色模式'}
      >
        {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
      </button>
    </div>
  );
}