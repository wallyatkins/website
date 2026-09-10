import React, { useState, useEffect, useRef } from 'react';
import { trackPageView } from './analytics';
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
import { IRCInterface } from './components/IRCInterface';
import { Fhqwhgads } from './components/easter-eggs/Fhqwhgads';
import { GamesPage } from './components/GamesPage';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isCreativeMode, setIsCreativeMode] = useState(false);

  // Sync browser popstate (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (path.startsWith('/#')) {
      const hash = path.substring(1);
      window.history.pushState({}, '', '/');
      setCurrentPath('/');
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 50);
      return;
    }

    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Easter Egg: IRC Mode Check
  const params = new URLSearchParams(window.location.search);
  const ircId = params.get('irc_id');
  const token = params.get('token');

  // Sync body classes
  useEffect(() => {
    document.body.classList.toggle('light-mode', isLightMode);
    document.body.classList.toggle('creative-mode', isCreativeMode);
  }, [isLightMode, isCreativeMode]);

  const toggleTheme = () => {
    setIsLightMode(!isLightMode);
  };

  const toggleCreativeMode = (e: React.MouseEvent) => {
    // 2. Burn Reveal Effect
    const burnOverlay = document.createElement('div');
    burnOverlay.className = 'burn-overlay';
    burnOverlay.style.setProperty('--click-x', e.clientX + 'px');
    burnOverlay.style.setProperty('--click-y', e.clientY + 'px');
    document.body.appendChild(burnOverlay);

    // 3. Toggle Mode after delay
    setTimeout(() => {
      setIsCreativeMode(prev => !prev);
      // Remove Burn Overlay
      setTimeout(() => burnOverlay.remove(), 1000);
    }, 750);
  };

  const isInitialRender = useRef(true);
  useEffect(() => {
    if (!currentPath.startsWith('/games')) {
      document.title = "Wally Atkins | Creator & Technologist";
      if (!isInitialRender.current) {
        trackPageView(currentPath, "Wally Atkins | Creator & Technologist");
      }
    }
    isInitialRender.current = false;
  }, [currentPath]);

  if (ircId && token) {
    return (
      <div className="chat-fullscreen-wrapper">
        <IRCInterface ircId={ircId} token={token} />
      </div>
    );
  }

  return (
    <EasterEggProvider>
      <Layout currentPath={currentPath} onNavigate={navigateTo}>
        <WhimsicalLayer isVisible={isCreativeMode} />
        {currentPath.startsWith('/games') ? (
          <GamesPage onNavigate={navigateTo} />
        ) : (
          <>
            <Hero
              isLightMode={isLightMode}
              isCreativeMode={isCreativeMode}
              toggleTheme={toggleTheme}
            />
            <About
              isCreativeMode={isCreativeMode}
              toggleCreativeMode={toggleCreativeMode}
            />
            <Projects onNavigate={navigateTo} />
            <Process />
            <ContactForm />
            <CTA />
          </>
        )}
        <Zoltar />
        <Fhqwhgads />
      </Layout>
    </EasterEggProvider>
  );
}

export default App;
