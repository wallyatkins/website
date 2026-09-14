import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { PrivacyPage } from './components/PrivacyPage';
import { TermsPage } from './components/TermsPage';

const SECTION_MAP: Record<string, string> = {
  '/': 'hero',
  '/about': 'about',
  '/work': 'work',
  '/process': 'process',
  '/contact': 'contact',
};

const PAGE_TITLES: Record<string, string> = {
  '/': 'Wally Atkins | Creator & Technologist',
  '/about': 'About | Wally Atkins',
  '/work': 'Selected Projects & Apps | Wally Atkins',
  '/process': 'Process | Wally Atkins',
  '/contact': 'Get in Touch | Wally Atkins',
  '/games': 'Games & MUDs | Wally Atkins',
  '/privacy': 'Privacy Policy | Wally Atkins',
  '/terms': 'Terms of Use | Wally Atkins',
};

function App() {
  // Normalize initial path if someone enters with legacy hash e.g. #contact or /#contact
  const getInitialPath = () => {
    if (typeof window === 'undefined') return '/';
    if (window.location.hash) {
      const hashName = window.location.hash.replace(/^\/?#/, '');
      if (['about', 'work', 'process', 'contact', 'hero'].includes(hashName)) {
        const clean = hashName === 'hero' ? '/' : `/${hashName}`;
        window.history.replaceState({}, '', clean);
        return clean;
      }
    }
    return window.location.pathname || '/';
  };

  const [currentPath, setCurrentPath] = useState(getInitialPath);
  const [isLightMode, setIsLightMode] = useState(false);
  const [isCreativeMode, setIsCreativeMode] = useState(false);
  const isNavigatingRef = useRef(false);
  const isInitialRender = useRef(true);

  const scrollToSection = useCallback((sectionId: string) => {
    if (sectionId === 'hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setTimeout(() => {
        const retryEl = document.getElementById(sectionId);
        if (retryEl) {
          retryEl.scrollIntoView({ behavior: 'smooth' });
        }
      }, 80);
    }
  }, []);

  // Sync browser popstate (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname || '/';
      setCurrentPath(path);
      const sectionId = SECTION_MAP[path];
      if (sectionId) {
        scrollToSection(sectionId);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [scrollToSection]);

  const navigateTo = (rawPath: string) => {
    // Strip any legacy hash prefixes
    let path = rawPath.replace(/^\/?#/, '/');
    if (!path.startsWith('/')) path = `/${path}`;
    if (path === '/hero') path = '/';

    isNavigatingRef.current = true;
    window.history.pushState({}, '', path);
    setCurrentPath(path);

    const sectionId = SECTION_MAP[path];
    if (sectionId) {
      scrollToSection(sectionId);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setTimeout(() => {
      isNavigatingRef.current = false;
    }, 800);
  };

  // Scroll to requested section on initial load if path is a section
  useEffect(() => {
    const sectionId = SECTION_MAP[currentPath];
    if (sectionId && currentPath !== '/') {
      setTimeout(() => {
        scrollToSection(sectionId);
      }, 150);
    }
  }, []); // Run once on mount

  // Title and Analytics tracking
  useEffect(() => {
    const title = PAGE_TITLES[currentPath] || 'Wally Atkins | Creator & Technologist';
    document.title = title;

    if (!isInitialRender.current) {
      trackPageView(currentPath, title);
    }
    isInitialRender.current = false;
  }, [currentPath]);

  // Scroll spy / IntersectionObserver for home page sections to keep clean paths in address bar
  useEffect(() => {
    const isStandalonePage =
      currentPath.startsWith('/games') ||
      currentPath.startsWith('/privacy') ||
      currentPath.startsWith('/terms');

    if (isStandalonePage) return;

    const sections = ['hero', 'about', 'work', 'process', 'contact'];
    const elements = sections
      .map(id => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isNavigatingRef.current) return;

        const visibleEntry = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry) {
          const sectionId = visibleEntry.target.id;
          const cleanPath = sectionId === 'hero' ? '/' : `/${sectionId}`;
          if (window.location.pathname !== cleanPath) {
            window.history.replaceState({}, '', cleanPath);
            setCurrentPath(cleanPath);
          }
        }
      },
      { threshold: [0.2, 0.5, 0.8], rootMargin: '-10% 0px -40% 0px' }
    );

    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [currentPath]);

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
    const burnOverlay = document.createElement('div');
    burnOverlay.className = 'burn-overlay';
    burnOverlay.style.setProperty('--click-x', e.clientX + 'px');
    burnOverlay.style.setProperty('--click-y', e.clientY + 'px');
    document.body.appendChild(burnOverlay);

    setTimeout(() => {
      setIsCreativeMode(prev => !prev);
      setTimeout(() => burnOverlay.remove(), 1000);
    }, 750);
  };

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
        ) : currentPath.startsWith('/privacy') ? (
          <PrivacyPage onNavigate={navigateTo} />
        ) : currentPath.startsWith('/terms') ? (
          <TermsPage onNavigate={navigateTo} />
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
