import { useState } from 'react';
import { XToolPage } from '@pages/XToolPage';

function App() {
  const [theme, setTheme] = useState<'nord' | 'nord-light'>('nord');

  const toggleTheme = () => {
    setTheme(prev => prev === 'nord' ? 'nord-light' : 'nord');
  };

  return (
    <div className="min-h-screen relative" data-theme={theme}>
      <main className="relative z-10">
        <XToolPage />
      </main>
      <button onClick={toggleTheme} className="fixed bottom-4 right-4 z-50 btn btn-circle" aria-label="切換主題">
        🌙
      </button>
    </div>
  );
}

export default App;
