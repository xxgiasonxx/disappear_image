import { useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigation } from '@components/Navigation/Navigation';
import { FloatingButtons } from '@components/FloatingButtons/FloatingButtons';
import { Comparison } from '@pages/Comparison';
import { AlgorithmDemo } from '@pages/AlgorithmDemo';
import { Explanation } from '@pages/Explanation';
import { Playground } from '@pages/Playground';

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
};

const pageTransition = {
  duration: 0.3,
  ease: 'easeOut' as const,
};

function ComparisonPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <Comparison />
    </motion.div>
  );
}

function AlgorithmDemoPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <AlgorithmDemo />
    </motion.div>
  );
}

function ExplanationPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <Explanation />
    </motion.div>
  );
}

function PlaygroundPage() {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <Playground />
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<ComparisonPage />} />
        <Route path="/algorithm" element={<AlgorithmDemoPage />} />
        <Route path="/explanation" element={<ExplanationPage />} />
        <Route path="/playground" element={<PlaygroundPage />} />
      </Routes>
    </AnimatePresence>
  );
}

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
          <AnimatedRoutes />
        </main>
        <FloatingButtons currentTheme={theme} onThemeToggle={toggleTheme} />
      </div>
    </BrowserRouter>
  );
}

export default App;