import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import './InstallApp.css';

interface InstallAppPageProps {
  onNavigate?: (path: string) => void;
}

type DeviceOS = 'ios' | 'android' | 'desktop';

export const InstallAppPage: React.FC<InstallAppPageProps> = ({ onNavigate }) => {
  const { canInstall, isStandalone, installApp } = usePWA();
  const [activeTab, setActiveTab] = useState<DeviceOS>(() => {
    if (typeof window === 'undefined') return 'ios';
    const ua = window.navigator.userAgent || '';
    if (/iPhone|iPad|iPod/i.test(ua)) {
      return 'ios';
    }
    if (/Android/i.test(ua)) {
      return 'android';
    }
    return 'desktop';
  });

  const launchApp = () => {
    localStorage.setItem('wally_app_mode', 'pwa');
    if (onNavigate) {
      onNavigate('/pickem');
    } else {
      window.location.href = '/?source=pwa';
    }
  };

  return (
    <div className="install-page-container">
      {/* If already running in installed standalone mode */}
      {isStandalone && (
        <div className="standalone-installed-banner">
          <span>✅</span>
          <span>You are currently running the installed app!</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="install-hero">
        <div className="install-app-icon-wrap">
          <img
            src="/icon-192.png"
            alt="Wally Atkins App"
            className="install-app-icon"
          />
          <span className="install-app-badge">🏈</span>
        </div>
        <h1 className="install-title">Get the App</h1>
        <p className="install-subtitle">
          Install directly to your iPhone or Android home screen for instant access, full-screen view, and game-day pick reminders.
        </p>

        {/* Action Buttons */}
        <div className="install-actions-bar">
          {canInstall && !isStandalone && (
            <button
              type="button"
              className="btn-install-primary"
              onClick={installApp}
            >
              <span>📲</span>
              <span>Install to Home Screen</span>
            </button>
          )}

          <button
            type="button"
            className="btn-launch-secondary"
            onClick={launchApp}
          >
            <span>🚀</span>
            <span>Launch Web App</span>
          </button>
        </div>
      </div>

      {/* Device OS Selector Tabs */}
      <div className="device-tabs-wrap">
        <button
          type="button"
          className={`device-tab-btn ${activeTab === 'ios' ? 'active' : ''}`}
          onClick={() => setActiveTab('ios')}
        >
          <span>🍎</span>
          <span>iPhone / iPad</span>
        </button>

        <button
          type="button"
          className={`device-tab-btn ${activeTab === 'android' ? 'active' : ''}`}
          onClick={() => setActiveTab('android')}
        >
          <span>🤖</span>
          <span>Android</span>
        </button>

        <button
          type="button"
          className={`device-tab-btn ${activeTab === 'desktop' ? 'active' : ''}`}
          onClick={() => setActiveTab('desktop')}
        >
          <span>💻</span>
          <span>Desktop &amp; QR Code</span>
        </button>
      </div>

      {/* Tab 1: iOS / iPhone Instructions */}
      {activeTab === 'ios' && (
        <div className="install-guide-card">
          <div className="guide-header">
            <span className="guide-os-tag">Apple iOS (Safari)</span>
            <h2 className="guide-title">How to Install on iPhone</h2>
          </div>

          <div className="steps-list">
            <div className="step-item">
              <span className="step-num-badge">1</span>
              <div className="step-body">
                <h3 className="step-heading">
                  <span>Tap the Share Button</span>
                  <span className="step-ui-chip">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                    Share
                  </span>
                </h3>
                <p className="step-desc">
                  Open this page in <strong>Safari</strong> and tap the square <strong>Share icon</strong> at the bottom center of the screen.
                </p>
              </div>
            </div>

            <div className="step-item">
              <span className="step-num-badge">2</span>
              <div className="step-body">
                <h3 className="step-heading">
                  <span>Select &ldquo;Add to Home Screen&rdquo;</span>
                  <span className="step-ui-chip">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                    Add to Home Screen
                  </span>
                </h3>
                <p className="step-desc">
                  Scroll down the menu options and tap <strong>Add to Home Screen</strong>.
                </p>
              </div>
            </div>

            <div className="step-item">
              <span className="step-num-badge">3</span>
              <div className="step-body">
                <h3 className="step-heading">
                  <span>Tap &ldquo;Add&rdquo; in Top Right</span>
                </h3>
                <p className="step-desc">
                  Tap <strong>Add</strong> in the top right corner. The app icon will appear directly on your home screen!
                </p>
              </div>
            </div>
          </div>

          <div className="safari-callout">
            <span>ℹ️</span>
            <span>
              <strong>Note:</strong> Apple requires using <strong>Safari</strong> to add apps to your iPhone home screen and enable notifications. If you are inside another browser or app, tap Share &rarr; <em>Open in Safari</em> first.
            </span>
          </div>
        </div>
      )}

      {/* Tab 2: Android Instructions */}
      {activeTab === 'android' && (
        <div className="install-guide-card">
          <div className="guide-header">
            <span className="guide-os-tag">Google Android (Chrome / Samsung)</span>
            <h2 className="guide-title">How to Install on Android</h2>
          </div>

          {canInstall && !isStandalone ? (
            <div style={{ textAlign: 'center', padding: '1rem 0 2rem' }}>
              <button
                type="button"
                className="btn-install-primary"
                onClick={installApp}
                style={{ width: '100%', maxWidth: '340px' }}
              >
                <span>📲</span>
                <span>Tap to Install App Now</span>
              </button>
              <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.75rem' }}>
                Your browser is ready — tap the button above to add the app to your home screen with 1 click.
              </p>
            </div>
          ) : (
            <div className="steps-list">
              <div className="step-item">
                <span className="step-num-badge">1</span>
                <div className="step-body">
                  <h3 className="step-heading">
                    <span>Tap the Three Dots Menu</span>
                    <span className="step-ui-chip">⋮ Menu</span>
                  </h3>
                  <p className="step-desc">
                    In Chrome or your Android browser, tap the <strong>three vertical dots (⋮)</strong> in the upper right corner.
                  </p>
                </div>
              </div>

              <div className="step-item">
                <span className="step-num-badge">2</span>
                <div className="step-body">
                  <h3 className="step-heading">
                    <span>Tap &ldquo;Install app&rdquo; or &ldquo;Add to Home screen&rdquo;</span>
                  </h3>
                  <p className="step-desc">
                    Select <strong>Install app</strong> (or <strong>Add to Home screen</strong>) from the menu list.
                  </p>
                </div>
              </div>

              <div className="step-item">
                <span className="step-num-badge">3</span>
                <div className="step-body">
                  <h3 className="step-heading">
                    <span>Confirm &ldquo;Install&rdquo;</span>
                  </h3>
                  <p className="step-desc">
                    Tap <strong>Install</strong> when prompted. The app will be placed on your home screen and app drawer.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Desktop & QR Code */}
      {activeTab === 'desktop' && (
        <div className="install-guide-card">
          <div className="guide-header" style={{ textAlign: 'center' }}>
            <span className="guide-os-tag">Mobile QR Code Scan</span>
            <h2 className="guide-title">Scan with Your Phone Camera</h2>
          </div>

          <div className="qr-container">
            <div className="qr-frame">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https%3A%2F%2Fwallyatkins.com%2Fapp"
                alt="QR Code for https://wallyatkins.com/app"
                className="qr-image"
                loading="eager"
              />
            </div>
            <p className="qr-caption">Point your phone&apos;s camera here</p>
            <p className="qr-subtext">
              Automatically opens this page on your iPhone or Android device so you can install it in seconds.
            </p>

            <button
              type="button"
              className="btn-launch-secondary"
              onClick={launchApp}
            >
              <span>💻</span>
              <span>Open Web App on Desktop</span>
            </button>
          </div>
        </div>
      )}

      {/* Feature Highlights */}
      <div className="install-features-row">
        <div className="install-feat-card">
          <span className="feat-icon">⚡</span>
          <h3 className="feat-title">Instant App Launch</h3>
          <p className="feat-desc">
            Opens in full-screen standalone mode without URL bars or browser controls.
          </p>
        </div>

        <div className="install-feat-card">
          <span className="feat-icon">🔔</span>
          <h3 className="feat-title">Game-Day Alerts</h3>
          <p className="feat-desc">
            Receive native lock-screen notifications before game kickoff if your picks are missing.
          </p>
        </div>

        <div className="install-feat-card">
          <span className="feat-icon">🔐</span>
          <h3 className="feat-title">Unified WallyAuth</h3>
          <p className="feat-desc">
            Seamlessly signed in with passkeys, face/fingerprint unlock, and device trust.
          </p>
        </div>
      </div>
    </div>
  );
};
