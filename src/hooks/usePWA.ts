import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function getPWAClientUuid(): string {
  try {
    let uuid = localStorage.getItem('pwa_client_uuid');
    if (!uuid) {
      uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : 'pwa_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('pwa_client_uuid', uuid);
    }
    return uuid;
  } catch {
    return 'pwa_client_' + Date.now().toString(36);
  }
}

export function detectDevicePlatform(): string {
  const ua = navigator.userAgent || '';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macos';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  return 'other';
}

export function detectBrowser(): string {
  const ua = navigator.userAgent || '';
  if (/Edg/i.test(ua)) return 'Edge';
  if (/CriOS|Chrome/i.test(ua)) return 'Chrome';
  if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) return 'Safari';
  if (/Firefox|FxiOS/i.test(ua)) return 'Firefox';
  return 'Browser';
}

export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  } catch {
    return 'America/New_York';
  }
}

export async function sendPWATelemetry(params: {
  eventType: 'install' | 'launch' | 'auth_link' | 'visit';
  installedVia?: string;
  username?: string;
  pushEnabled?: boolean;
}) {
  try {
    const clientUuid = getPWAClientUuid();
    const platform = detectDevicePlatform();
    const browser = detectBrowser();
    const timezone = detectUserTimezone();
    const isDisplayStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const isUrlPwa = window.location.search.includes('source=pwa');
    const isStandalone = Boolean(isDisplayStandalone || isIosStandalone || isUrlPwa);
    const displayMode = isStandalone ? 'standalone' : 'browser';
    const installedVia = params.installedVia || (isStandalone ? 'standalone_launch' : 'browser');

    await fetch('/football_api.php?action=record_pwa_telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        client_uuid: clientUuid,
        platform,
        browser,
        timezone,
        display_mode: displayMode,
        installed_via: installedVia,
        event_type: params.eventType,
        username: params.username,
        push_enabled: params.pushEnabled ? 1 : 0,
      }),
    });
  } catch (err) {
    console.debug('[PWA Telemetry] Non-blocking ping error:', err);
  }
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
      const isUrlPwa = window.location.search.includes('source=pwa');
      const standalone = Boolean(isDisplayStandalone || isIosStandalone || isUrlPwa);
      setIsStandalone(standalone);
      return standalone;
    };

    const standalone = checkStandalone();
    const mql = window.matchMedia('(display-mode: standalone)');
    const handleMqlChange = (e: MediaQueryListEvent) => {
      const isNowStandalone = e.matches;
      setIsStandalone(isNowStandalone);
      if (isNowStandalone) {
        sendPWATelemetry({ eventType: 'launch', installedVia: 'standalone_launch' });
      }
    };
    mql.addEventListener('change', handleMqlChange);

    // Initial launch heartbeat once per session
    try {
      const sessionKey = 'pwa_launch_recorded';
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, '1');
        sendPWATelemetry({
          eventType: standalone ? 'launch' : 'visit',
          installedVia: standalone ? 'standalone_launch' : 'browser',
        });
      }
    } catch {
      // Non-blocking
    }

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
      sendPWATelemetry({ eventType: 'install', installedVia: 'appinstalled_event' });
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
        sendPWATelemetry({ eventType: 'install', installedVia: 'appinstalled_event' });
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
