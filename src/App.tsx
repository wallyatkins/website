import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Hero } from './components/Hero';
import { About } from './components/About';
import { Projects } from './components/Projects';
import { Process } from './components/Process';
import { ContactForm } from './components/ContactForm';
import { WhimsicalLayer } from './components/WhimsicalLayer';
import { EasterEggProvider } from './context/EasterEggContext';
import { Zoltar } from './components/easter-eggs/Zoltar';
import { CTA } from './components/CTA';

function App() {
  const [isLightMode, setIsLightMode] = useState(false);
  const [isArtMode, setIsArtMode] = useState(false);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
  };

  const toggleArtMode = (e: React.MouseEvent) => {
    // 2. Burn Reveal Effect
    const burnOverlay = document.createElement('div');
    burnOverlay.className = 'burn-overlay';
    burnOverlay.style.setProperty('--click-x', e.clientX + 'px');
    burnOverlay.style.setProperty('--click-y', e.clientY + 'px');
    document.body.appendChild(burnOverlay);

    // 3. Toggle Mode after delay
    setTimeout(() => {
      setIsArtMode(prev => !prev);
      // Remove Burn Overlay
      setTimeout(() => burnOverlay.remove(), 1000);
    }, 750);
  };

  // Sync body classes
  useEffect(() => {
    document.body.classList.toggle('light-mode', isLightMode);
    document.body.classList.toggle('art-mode', isArtMode);
  }, [isLightMode, isArtMode]);

  return (
    <EasterEggProvider>
      <Layout>
        <WhimsicalLayer isVisible={isArtMode} />
        <Hero
          isLightMode={isLightMode}
          isArtMode={isArtMode}
          toggleTheme={toggleTheme}
        />
        <About
          isArtMode={isArtMode}
          toggleArtMode={toggleArtMode}
        />
        <Projects />
        <Process />
        <ContactForm />
        <CTA />
        <Zoltar />
      </Layout>
    </EasterEggProvider>
  );
}

export default App;
