import { useState, useEffect, useCallback } from 'react';

interface FloatingButtonsProps {
  currentTheme: 'nord' | 'nord-light';
  onThemeToggle: () => void;
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 10l7-7m0 0l7 7m-7-7v18" />
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

  const themeIconClass = isDarkMode ? 'text-yellow-400' : 'text-indigo-600';
  const buttonBgClass = isDarkMode 
    ? 'bg-base-200 text-base-content hover:bg-base-300' 
    : 'bg-base-300 text-base-content hover:bg-base-200';

  if (isMobile) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex gap-2">
        <button
          onClick={onThemeToggle}
          className={`btn btn-circle btn-sm ${buttonBgClass} shadow-lg`}
          aria-label={isDarkMode ? '切換到亮色模式' : '切換到暗色模式'}
        >
          {isDarkMode ? (
            <SunIcon className={`w-4 h-4 ${themeIconClass}`} />
          ) : (
            <MoonIcon className={`w-4 h-4 ${themeIconClass}`} />
          )}
        </button>
        {isVisible && (
          <button
            onClick={scrollToTop}
            className={`btn btn-circle btn-sm ${buttonBgClass} shadow-lg`}
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
          className={`btn btn-circle btn-lg ${buttonBgClass} shadow-lg transition-all duration-300 hover:scale-110`}
          aria-label="回到頂部"
        >
          <ArrowUpIcon className="w-5 h-5" />
        </button>
      )}
      <button
        onClick={onThemeToggle}
        className={`btn btn-circle btn-lg ${buttonBgClass} shadow-lg transition-all duration-300 hover:scale-110`}
        aria-label={isDarkMode ? '切換到亮色模式' : '切換到暗色模式'}
      >
        {isDarkMode ? (
          <SunIcon className={`w-5 h-5 ${themeIconClass}`} />
        ) : (
          <MoonIcon className={`w-5 h-5 ${themeIconClass}`} />
        )}
      </button>
    </div>
  );
}