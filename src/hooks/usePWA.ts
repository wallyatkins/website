import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // 1. Detect if running standalone (installed PWA)
    const checkStandalone = () => {
      const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(Boolean(isDisplayStandalone || isIosStandalone));
    };

    checkStandalone();
    const mql = window.matchMedia('(display-mode: standalone)');
    const handleMqlChange = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mql.addEventListener('change', handleMqlChange);

    // 2. Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // 3. Register Service Worker with seamless auto-update
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          registrationRef.current = registration;

          // If a worker is already waiting, trigger immediate skipWaiting
          if (registration.waiting) {
            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          }

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // Proactively skip waiting for automatic instant update
                  setIsUpdating(true);
                  newWorker.postMessage({ type: 'SKIP_WAITING' });
                }
              });
            }
          });
        })
        .catch((err) => {
          console.warn('[PWA] Service worker registration failed:', err);
        });

      // Reload smoothly when active controller changes
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      // 4. Proactive update checks on window focus and every 60s
      const checkForUpdates = () => {
        if (registrationRef.current) {
          registrationRef.current.update().catch(() => {});
        }
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          checkForUpdates();
        }
      };

      window.addEventListener('focus', checkForUpdates);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      const intervalId = setInterval(checkForUpdates, 60 * 1000);

      return () => {
        clearInterval(intervalId);
        window.removeEventListener('focus', checkForUpdates);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        mql.removeEventListener('change', handleMqlChange);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
        window.removeEventListener('appinstalled', handleAppInstalled);
      };
    }

    return () => {
      mql.removeEventListener('change', handleMqlChange);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
      }
    } catch (err) {
      console.warn('[PWA] Prompt error:', err);
    } finally {
      setDeferredPrompt(null);
      setCanInstall(false);
    }
  }, [deferredPrompt]);

  const checkForUpdate = useCallback(() => {
    if (registrationRef.current) {
      registrationRef.current.update();
    }
  }, []);

  return {
    canInstall,
    isStandalone,
    isInstalled,
    isUpdating,
    needRefresh: isUpdating,
    installApp,
    updateApp: checkForUpdate,
    checkForUpdate,
  };
}
