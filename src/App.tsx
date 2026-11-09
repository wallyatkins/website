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
import { AppsPage } from './components/AppsPage';
import { FootballPickemApp } from './components/FootballPickemApp';
import { PrivacyPage } from './components/PrivacyPage';
import { TermsPage } from './components/TermsPage';

const SECTION_MAP: Record<string, string> = {
  '/portfolio': 'hero',
  '/about': 'about',
  '/work': 'work',
  '/process': 'process',
  '/contact': 'contact',
};

const PAGE_TITLES: Record<string, string> = {
  '/': 'Wally Atkins | Creator & Technologist',
  '/pickem': "Wally Atkins | NFL Pick'em",
  '/pwa': 'Wally Atkins | Application Suite',
  '/portfolio': 'Wally Atkins | Creator & Technologist',
  '/about': 'About | Wally Atkins',
  '/work': 'Selected Projects & Apps | Wally Atkins',
  '/apps': 'Application Suite & Portal | Wally Atkins',
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

  // Distinguish PWA App Suite mode vs Personal Portfolio Website
  const [isPwaMode, setIsPwaMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const isStandaloneDisplay = window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const searchParams = new URLSearchParams(window.location.search);
    const hasPwaParam =
      searchParams.get('source') === 'pwa' ||
      searchParams.get('pwa') === 'true' ||
      searchParams.has('app');
    const isPwaPath =
      window.location.pathname.startsWith('/pickem') ||
      window.location.pathname.startsWith('/pwa');

    const storedMode = localStorage.getItem('wally_app_mode');
    if (storedMode === 'website' && !hasPwaParam && !isPwaPath) {
      return false;
    }
    return Boolean(isStandaloneDisplay || isIosStandalone || hasPwaParam || isPwaPath || storedMode === 'pwa');
  });

  const isNavigatingRef = useRef(false);
  const isInitialRender = useRef(true);

  // Check URL params for chat interface (ircId & token)
  const [ircId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('ircId');
  });
  const [token] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return new URLSearchParams(window.location.search).get('token');
  });

  const scrollToSection = useCallback((sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
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

    if (path === '/pickem' || path === '/pwa') {
      setIsPwaMode(true);
      localStorage.setItem('wally_app_mode', 'pwa');
    }

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
    let title = PAGE_TITLES[currentPath] || 'Wally Atkins | Creator & Technologist';
    if (isPwaMode) {
      title = "Wally Atkins | NFL Pick'em";
    }
    document.title = title;

    if (!isInitialRender.current) {
      trackPageView(currentPath, title);
    }
    isInitialRender.current = false;
  }, [currentPath, isPwaMode]);

  // Scroll spy / IntersectionObserver for home page sections to keep clean paths in address bar
  useEffect(() => {
    if (isPwaMode || currentPath.startsWith('/apps') || currentPath.startsWith('/games') || currentPath.startsWith('/privacy') || currentPath.startsWith('/terms')) {
      return;
    }

    const sections = ['hero', 'about', 'work', 'process', 'contact'];
    const sectionElements = sections
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        if (isNavigatingRef.current) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.3) {
            const id = entry.target.id;
            const newPath = id === 'hero' ? '/' : `/${id}`;

            if (window.location.pathname !== newPath) {
              window.history.replaceState({}, '', newPath);
              setCurrentPath(newPath);
            }
          }
        });
      },
      {
        threshold: [0.3],
        rootMargin: '-80px 0px -40% 0px',
      }
    );

    sectionElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [currentPath, isPwaMode]);

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
      setIsCreativeMode((prev) => !prev);
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

  // PWA APP SUITE VIEW (Football Pick'em as first suite application)
  if (isPwaMode || currentPath === '/pickem' || currentPath === '/pwa') {
    return (
      <FootballPickemApp
        onSwitchToWebsite={() => {
          localStorage.setItem('wally_app_mode', 'website');
          setIsPwaMode(false);
          navigateTo('/');
        }}
      />
    );
  }

  // PERSONAL PORTFOLIO WEBSITE VIEW
  return (
    <EasterEggProvider>
      <Layout currentPath={currentPath} onNavigate={navigateTo}>
        <WhimsicalLayer isVisible={isCreativeMode} />
        {currentPath.startsWith('/apps') ? (
          <AppsPage onNavigate={navigateTo} />
        ) : currentPath.startsWith('/games') ? (
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
