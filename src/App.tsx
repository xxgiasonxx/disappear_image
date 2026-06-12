import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navigation } from '@components/Navigation/Navigation';
import { PixelBackground } from '@components/PixelBackground/PixelBackground';
import { FloatingButtons } from '@components/FloatingButtons/FloatingButtons';
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
        <PixelBackground />
        <Navigation />
        <main className="relative z-10 pt-16">
          <Routes>
            <Route path="/" element={<Comparison />} />
            <Route path="/comparison" element={<Comparison />} />
            <Route path="/algorithm" element={<AlgorithmDemo />} />
            <Route path="/explanation" element={<Explanation />} />
            <Route path="/playground" element={<Playground />} />
          </Routes>
        </main>
        <FloatingButtons currentTheme={theme} onThemeToggle={toggleTheme} />
      </div>
    </BrowserRouter>
  );
}

export default App;
