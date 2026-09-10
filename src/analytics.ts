type MatomoCommand = [string, ...unknown[]];

declare global {
  interface Window {
    _paq?: MatomoCommand[];
  }
}

const matomoPath = '/matomo.php';

window._paq = window._paq || [];
window._paq.push(['setCookieDomain', '*.wallyatkins.com']);
window._paq.push(['setTrackerUrl', matomoPath]);
window._paq.push(['setSiteId', '2']);
window._paq.push(['enableLinkTracking']);
window._paq.push(['trackPageView']);

const script = document.createElement('script');
script.async = true;
script.src = matomoPath;
document.head.appendChild(script);

export function trackPageView(customUrl?: string, customTitle?: string): void {
  if (typeof window !== 'undefined' && window._paq) {
    if (customUrl) {
      window._paq.push(['setCustomUrl', customUrl]);
    }
    if (customTitle) {
      window._paq.push(['setDocumentTitle', customTitle]);
    }
    window._paq.push(['trackPageView']);
  }
}
