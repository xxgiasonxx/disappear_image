import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from '@components/Navigation/Navigation';
import { Comparison } from '@pages/Comparison';
import { AlgorithmDemo } from '@pages/AlgorithmDemo';
import { Explanation } from '@pages/Explanation';
import { Playground } from '@pages/Playground';

function App() {
  const [theme, setTheme] = useState<'nord' | 'nord-light'>('nord');

  const toggleTheme = () => {
    setTheme(prev => prev === 'nord' ? 'nord-light' : 'nord');
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen relative" data-theme={theme}>
        <Navigation />
        <main className="relative z-10">
          <Routes>
            <Route path="/" element={<Comparison />} />
            <Route path="/algorithm" element={<AlgorithmDemo />} />
            <Route path="/explanation" element={<Explanation />} />
            <Route path="/playground" element={<Playground />} />
          </Routes>
        </main>
        <button onClick={toggleTheme} className="fixed bottom-4 right-4 z-50 btn btn-circle" aria-label="切換主題">
          🌙
        </button>
      </div>
    </BrowserRouter>
  );
}

export default App;