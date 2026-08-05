type MatomoCommand = [string, ...unknown[]];

declare global {
  interface Window {
    _paq?: MatomoCommand[];
  }
}

const matomoPath = '/matomo.php';

window._paq = window._paq || [];
window._paq.push(['trackPageView']);
window._paq.push(['enableLinkTracking']);
window._paq.push(['setTrackerUrl', matomoPath]);
window._paq.push(['setSiteId', '2']);

const script = document.createElement('script');
script.async = true;
script.src = matomoPath;
document.head.appendChild(script);
