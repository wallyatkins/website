import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';

interface SuiteApp {
  id: string;
  name: string;
  url: string;
  category: 'Sports' | 'Productivity' | 'Gaming' | 'Media' | 'Security';
  icon: string;
  badge?: string;
  description: string;
  features: string[];
  roleRequired?: string;
}

const APPS: SuiteApp[] = [
  {
    id: 'football',
    name: 'Atkins NFL Pool',
    url: 'https://football.wallyatkins.com',
    category: 'Sports',
    icon: '🏈',
    badge: 'Popular',
    description: 'Weekly NFL straight-up pick’em, Game of the Week tiebreaker point differentials, and season-long Survivor pool.',
    features: ['Weekly Pick’em Picks', 'Survivor Pool Tracking', 'Daily Morning Digest', 'Live Standings'],
    roleRequired: 'Pickem Participant'
  },
  {
    id: 'tasks',
    name: 'Wally Tasks',
    url: 'https://tasks.wallyatkins.com',
    category: 'Productivity',
    icon: '📋',
    badge: 'AI Powered',
    description: 'Autonomous agentic productivity suite with priority scoring, review state transitions, and file attachments.',
    features: ['Agentic Task Queue', 'Priority Matrix', 'Cross-Platform Sync', 'Offline Storage'],
    roleRequired: 'Verified Member'
  },
  {
    id: 'mud',
    name: 'WallyMUD & Retro Worlds',
    url: 'https://mud.wallyatkins.com',
    category: 'Gaming',
    icon: '⚔️',
    badge: 'Live Realm',
    description: 'Modern Java Merc DikuMUD reimagined with a mobile-first touch interface, virtual directional pad, and live world events.',
    features: ['Touch D-Pad Controls', 'Persistent Inventory', 'Real-time Combat', 'Web ANSI Stream'],
    roleRequired: 'Public / Guest'
  },
  {
    id: 'wheres',
    name: 'Where’s Wally',
    url: 'https://wheres.wallyatkins.com',
    category: 'Media',
    icon: '🗺️',
    description: 'Interactive high-resolution Deep Zoom (DZI) travel chronicle, telemetry tracking, and location journals.',
    features: ['Multi-Scale Zoom', 'GPS Telemetry Trails', 'High-Res Photography', 'Interactive Pins'],
    roleRequired: 'Public'
  },
  {
    id: 'stories',
    name: 'Video Stories',
    url: 'https://stories.wallyatkins.com',
    category: 'Media',
    icon: '📹',
    description: 'Prompt-and-response 1-on-1 video storytelling service designed for genuine human connection over broadcast noise.',
    features: ['Private Story Prompts', 'Secure Video Pipelines', 'Async Video Exchange', 'Privacy First'],
    roleRequired: 'Private Circle'
  },
  {
    id: 'auth',
    name: 'WallyAuth SSO & Console',
    url: 'https://auth.wallyatkins.com',
    category: 'Security',
    icon: '🔐',
    badge: 'Space-Age Console',
    description: 'Centralized OpenID Connect (OIDC) identity provider with PKCE, RBAC role management, and audit telemetry.',
    features: ['Unified Single Sign-On', 'Role & Client Management', 'Live Audit Telemetry', 'Mobile-First Console'],
    roleRequired: 'All Users'
  }
];

export const AppsPage: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
  const { canInstall, isStandalone, isInstalled, installApp } = usePWA();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [favoriteAppId, setFavoriteAppId] = useState<string>(() => {
    return localStorage.getItem('wallyatkins_favorite_app') || '';
  });
  const [searchQuery, setSearchQuery] = useState('');

  const handleHomeClick = (e: React.MouseEvent) => {
    if (onNavigate) {
      e.preventDefault();
      onNavigate('/');
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newFav = favoriteAppId === id ? '' : id;
    setFavoriteAppId(newFav);
    if (newFav) {
      localStorage.setItem('wallyatkins_favorite_app', newFav);
    } else {
      localStorage.removeItem('wallyatkins_favorite_app');
    }
  };

  const categories = ['All', 'Sports', 'Productivity', 'Gaming', 'Media', 'Security'];

  const filteredApps = APPS.filter(app => {
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    const matchesQuery = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  }).sort((a, b) => {
    if (a.id === favoriteAppId) return -1;
    if (b.id === favoriteAppId) return 1;
    return 0;
  });

  return (
    <div className="apps-page-container">
      {/* Header Banner */}
      <div className="apps-hero">
        <div style={{ marginBottom: '1rem' }}>
          <a
            href="/"
            onClick={handleHomeClick}
            style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}
          >
            ← Back to Portfolio
          </a>
        </div>
        <div className="apps-badge-row">
          <span className="apps-badge">
            <span className="pulse-indicator"></span>
            {isStandalone ? 'PWA Standalone Mode' : 'PWA Application Portal'}
          </span>
          {isStandalone && (
            <span className="apps-badge standalone-badge">
              ✓ Subdomain Scope Active
            </span>
          )}
        </div>
        <h1 className="apps-title">Application Suite &amp; Hub</h1>
        <p className="apps-subtitle">
          Access all subdomains and web apps from one unified progressive web app. 
          Install on iOS, Android, macOS, or Windows for native instant launch.
        </p>

        {/* PWA Install Banner */}
        {canInstall && !isStandalone && (
          <div className="pwa-install-card">
            <div className="pwa-install-info">
              <span className="pwa-install-icon">📱</span>
              <div>
                <strong>Install Wally Atkins App</strong>
                <p>Add to your home screen or desktop dock for fast 1-tap access to Football Pick’em, Tasks, and more.</p>
              </div>
            </div>
            <button className="pwa-install-btn" onClick={installApp}>
              Install Now ↗
            </button>
          </div>
        )}

        {isInstalled && !isStandalone && (
          <div className="pwa-installed-hint">
            ⭐ App is installed! Launch it from your home screen or apps list for full-screen standalone mode.
          </div>
        )}
      </div>

      {/* Quick Launch / Favorite App Alert if set */}
      {favoriteAppId && (
        <div className="favorite-app-banner">
          <span className="favorite-star">⭐</span>
          <span>
            Pinned Quick Launch: <strong>{APPS.find(a => a.id === favoriteAppId)?.name}</strong>
          </span>
          <a
            href={APPS.find(a => a.id === favoriteAppId)?.url}
            className="favorite-launch-link"
          >
            Launch Pinned App ↗
          </a>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="apps-controls">
        <div className="apps-categories">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="apps-search-wrapper">
          <input
            type="text"
            className="apps-search-input"
            placeholder="Search apps by name, feature..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* App Cards Grid */}
      <div className="apps-grid">
        {filteredApps.map(app => {
          const isFav = favoriteAppId === app.id;
          return (
            <div key={app.id} className={`app-card ${isFav ? 'pinned' : ''}`}>
              <div className="app-card-header">
                <div className="app-card-identity">
                  <div className="app-card-icon">{app.icon}</div>
                  <div>
                    <h2 className="app-card-title">{app.name}</h2>
                    <span className="app-card-cat">{app.category}</span>
                  </div>
                </div>
                <button
                  className={`app-pin-btn ${isFav ? 'is-fav' : ''}`}
                  onClick={(e) => toggleFavorite(app.id, e)}
                  title={isFav ? 'Unpin app' : 'Pin to top of your portal'}
                  aria-label={isFav ? 'Unpin app' : 'Pin to top'}
                >
                  {isFav ? '★ Pinned' : '☆ Pin'}
                </button>
              </div>

              <p className="app-card-desc">{app.description}</p>

              <div className="app-features-list">
                {app.features.map((feat, idx) => (
                  <span key={idx} className="app-feature-tag">
                    • {feat}
                  </span>
                ))}
              </div>

              <div className="app-card-footer">
                <div className="app-role-badge">
                  <span className="role-dot"></span>
                  {app.roleRequired}
                </div>
                <a
                  href={app.url}
                  className="app-launch-btn"
                  target={isStandalone ? '_self' : '_blank'}
                  rel="noreferrer"
                >
                  Open App ↗
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Single Sign-On Status & Info */}
      <div className="apps-sso-footer">
        <div className="sso-box">
          <div className="sso-icon">🔐</div>
          <div>
            <h3>Unified WallyAuth Single Sign-On</h3>
            <p>
              Logging into any subdomain shares your encrypted session token across all services under <code>*.wallyatkins.com</code>.
              Your permissions determine which sections and features unlock automatically.
            </p>
          </div>
          <a
            href="https://auth.wallyatkins.com"
            className="sso-login-link"
            target="_blank"
            rel="noreferrer"
          >
            Manage SSO Account ↗
          </a>
        </div>
      </div>
    </div>
  );
};
