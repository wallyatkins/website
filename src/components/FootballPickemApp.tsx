import React, { useState, useEffect, useRef } from 'react';
import { usePWA, sendPWATelemetry } from '../hooks/usePWA';
import { FootballPickWizard, type FootballGame } from './FootballPickWizard';
import './FootballPickem.css';

interface Participant {
  entry_id: number;
  user_id: number;
  username: string;
  is_me: boolean;
  avatar_url?: string;
  correct_count: number;
  graded_count: number;
  mnf_points_prediction: number | null;
  picks: Record<
    string,
    {
      game_id: number;
      selected_team: string | null;
      is_revealed: boolean;
      result: 'correct' | 'incorrect' | 'push' | 'pending';
    }
  >;
}

interface CurrentUser {
  id: number | null;
  wallyauth_id?: string | null;
  username: string;
  email?: string | null;
  role: string;
  avatar_url?: string | null;
}

interface CurrentUserStatus {
  is_authenticated: boolean;
  auth_source?: string | null;
  user: CurrentUser | null;
  has_submitted: boolean;
  picks_count: number;
  total_games: number;
  missing_picks: boolean;
  user_picks: Record<number, string>;
  mnf_points: number | null;
}

interface WeekDataResponse {
  season: number;
  week: number;
  current_week: number;
  is_current_week: boolean;
  games: FootballGame[];
  tiebreaker_game: FootballGame | null;
  participants: Participant[];
  current_user_status: CurrentUserStatus;
}

interface LeagueUser {
  id: number;
  username: string;
  role: string;
  avatar_url?: string;
}

interface PwaInstallationRecord {
  id: number;
  client_uuid: string;
  user_id: number | null;
  wallyauth_id: string | null;
  username: string | null;
  email: string | null;
  platform: string;
  browser: string | null;
  timezone?: string | null;
  display_mode: string;
  installed_via: string;
  user_agent: string | null;
  installed_at: string;
  last_seen_at: string;
  launch_count: number;
  push_enabled: number;
  avatar_url?: string | null;
}

interface PwaMetricsData {
  summary: {
    total_installations: number;
    authenticated_installations: number;
    anonymous_installations: number;
    platforms: Array<{ platform: string; count: number }>;
  };
  installations: PwaInstallationRecord[];
  recent_activity: Array<{
    id: number;
    username: string | null;
    event_type: string;
    details: string;
    created_at: string;
  }>;
}

interface FootballPickemAppProps {
  onSwitchToWebsite?: () => void;
}

export const FootballPickemApp: React.FC<FootballPickemAppProps> = ({ onSwitchToWebsite }) => {
  const { canInstall, isStandalone, isUpdating, installApp } = usePWA();

  const [season, setSeason] = useState<number>(2026);
  const [currentWeek, setCurrentWeek] = useState<number>(9);
  const [availableWeeks, setAvailableWeeks] = useState<number[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number>(9);

  const [weekData, setWeekData] = useState<WeekDataResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [leagueUsers, setLeagueUsers] = useState<LeagueUser[]>([]);
  const [isSwitchingUser, setIsSwitchingUser] = useState<boolean>(false);

  const [isMetricsModalOpen, setIsMetricsModalOpen] = useState<boolean>(false);
  const [metricsData, setMetricsData] = useState<PwaMetricsData | null>(null);
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);

  const hasAutoLaunchedRef = useRef<boolean>(false);
  const weeksSliderRef = useRef<HTMLElement | null>(null);

  // 1. Fetch metadata on initial load (current week & available weeks)
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await fetch('/football_api.php?action=meta');
        if (res.ok) {
          const meta = await res.json();
          if (meta.season) setSeason(meta.season);
          if (meta.current_week) {
            setCurrentWeek(meta.current_week);
            setSelectedWeek(meta.current_week);
          }
          if (meta.available_weeks && Array.isArray(meta.available_weeks)) {
            setAvailableWeeks(meta.available_weeks);
          }
        }
      } catch (err) {
        console.error('Failed to load metadata', err);
      }
    };
    fetchMeta();
  }, []);

  // Scroll horizontal weeks slider as far right as possible by default to show current week
  useEffect(() => {
    if (weeksSliderRef.current && availableWeeks.length > 0) {
      // Immediate scroll right
      weeksSliderRef.current.scrollLeft = weeksSliderRef.current.scrollWidth;
      // Also ensure active week chip is smoothly centered into view
      const timeoutId = setTimeout(() => {
        if (weeksSliderRef.current) {
          const activeChip = weeksSliderRef.current.querySelector('.week-chip.active');
          if (activeChip) {
            activeChip.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          } else {
            weeksSliderRef.current.scrollTo({
              left: weeksSliderRef.current.scrollWidth,
              behavior: 'smooth',
            });
          }
        }
      }, 60);
      return () => clearTimeout(timeoutId);
    }
  }, [availableWeeks, currentWeek]);

  // 2. Fetch Matrix Data whenever selectedWeek changes
  const fetchWeekMatrix = async (weekToLoad: number) => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const res = await fetch(`/football_api.php?action=matrix&week=${weekToLoad}`);
      if (!res.ok) throw new Error(`Failed to load Week ${weekToLoad} matrix`);
      const data: WeekDataResponse = await res.json();

      setWeekData(data);
      setIsLoading(false);

      // Auto-link authenticated WallyAuth user to this PWA device installation
      if (data.current_user_status?.user?.username) {
        sendPWATelemetry({
          eventType: 'auth_link',
          username: data.current_user_status.user.username,
        });
      }

      // ONLY auto-launch if:
      // 1. It is the CURRENT week
      // 2. Has not auto-launched in this session
      // 3. User is authenticated with WallyAuth or football account
      // 4. User has NOT fully put in their picks for the week (missing_picks === true)
      if (
        data.is_current_week &&
        !hasAutoLaunchedRef.current &&
        data.current_user_status?.is_authenticated &&
        (!data.current_user_status?.has_submitted || data.current_user_status?.missing_picks)
      ) {
        hasAutoLaunchedRef.current = true;
        setIsWizardOpen(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading matrix';
      setFetchError(msg);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedWeek) {
      fetchWeekMatrix(selectedWeek);
    }
  }, [selectedWeek]);

  // Load league users list for quick in-PWA participant switcher
  const openAuthModal = async () => {
    setIsAuthModalOpen(true);
    if (leagueUsers.length === 0) {
      try {
        const res = await fetch('/football_api.php?action=users_list');
        const data = await res.json();
        if (data.users) {
          setLeagueUsers(data.users);
        }
      } catch {
        // Fallback
      }
    }
  };

  const fetchPwaMetrics = async () => {
    setIsLoadingMetrics(true);
    try {
      const res = await fetch('/football_api.php?action=pwa_metrics&secret=commish_wally', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setMetricsData(data);
      }
    } catch (err) {
      console.error('Failed to load PWA metrics', err);
    } finally {
      setIsLoadingMetrics(false);
    }
  };

  const handleSwitchUser = async (username: string) => {
    setIsSwitchingUser(true);
    try {
      const res = await fetch('/football_api.php?action=switch_user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (res.ok) {
        setIsAuthModalOpen(false);
        hasAutoLaunchedRef.current = false;
        await fetchWeekMatrix(selectedWeek);
      }
    } catch {
      // Ignored
    } finally {
      setIsSwitchingUser(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/football_api.php?action=logout', { method: 'POST' });
      setIsAuthModalOpen(false);
      await fetchWeekMatrix(selectedWeek);
    } catch (err) {
      console.error('Logout error', err);
    }
  };

  const handlePicksSaved = (newPicks: Record<number, string>, mnfPts: number | null) => {
    if (weekData) {
      setWeekData({
        ...weekData,
        current_user_status: {
          ...weekData.current_user_status,
          has_submitted: true,
          missing_picks: false,
          picks_count: Object.keys(newPicks).length,
          user_picks: newPicks,
          mnf_points: mnfPts,
        },
      });
    }

    // Refetch freshly from server to update matrix table
    fetchWeekMatrix(selectedWeek);
  };

  const currentUser = weekData?.current_user_status?.user;
  const isAuthenticated = Boolean(weekData?.current_user_status?.is_authenticated && currentUser);
  const isCurrentWeekSelected = selectedWeek === currentWeek;
  const userMissingPicks =
    weekData?.current_user_status?.missing_picks || !weekData?.current_user_status?.has_submitted;

  // SSO redirect URL to return directly back to PWA with source parameter
  const ssoRedirectUrl = `https://football.wallyatkins.com/auth/login?redirect=${encodeURIComponent(
    'https://wallyatkins.com/?source=pwa&app=football'
  )}`;

  return (
    <div className="football-pwa-container">
      {/* Auto-Updating Alert Toast */}
      {isUpdating && (
        <div className="pwa-auto-update-toast">
          <span className="pulse-dot"></span>
          <span>Updating to latest version...</span>
        </div>
      )}

      {/* 1. TOP BAR */}
      <header className="football-header">
        <div className="football-header-left">
          {/* Upper left: app logo/icon + module name */}
          <div className="module-brand-group">
            <span className="module-icon">🏈</span>
            <div className="module-titles">
              <h1 className="module-title">Football Pick'em</h1>
              <span className="module-subtitle">{season} Season</span>
            </div>
          </div>
        </div>

        <div className="football-header-right">
          {/* Action to edit picks if on current week */}
          {isCurrentWeekSelected && (
            <button
              type="button"
              className={`compact-pick-btn ${userMissingPicks ? 'pulse-cta' : ''}`}
              onClick={() => {
                if (!isAuthenticated) {
                  openAuthModal();
                } else {
                  setIsWizardOpen(true);
                }
              }}
            >
              <span>⚡</span>
              <span>{userMissingPicks ? 'Make Picks' : 'Edit Picks'}</span>
            </button>
          )}

          {/* Native Install Button */}
          {canInstall && !isStandalone && (
            <button className="pwa-header-install-btn" onClick={installApp}>
              📱 Install
            </button>
          )}

          {/* Upper right: Avatar circle only (no username, no commish badge) */}
          {isAuthenticated && currentUser ? (
            <button
              type="button"
              className="avatar-circle-btn"
              onClick={openAuthModal}
              title={`Signed in as @${currentUser.username} • Account & Profile`}
              aria-label="Account & Profile"
            >
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username}
                  className="avatar-circle-img"
                />
              ) : (
                <span className="avatar-circle-fallback">
                  {currentUser.username.charAt(0).toUpperCase()}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="avatar-circle-btn unauthenticated"
              onClick={openAuthModal}
              title="Sign in with WallyAuth"
              aria-label="Sign in"
            >
              <span className="avatar-signin-icon">🔐</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. HORIZONTAL WEEKS SLIDER (Right at top, default scrolled to right for current week) */}
      <nav ref={weeksSliderRef} className="weeks-slider-wrapper" aria-label="NFL Weeks Navigation">
        <div className="weeks-slider">
          {availableWeeks.map((w) => {
            const isCurrent = w === currentWeek;
            const isSelected = w === selectedWeek;
            return (
              <button
                key={w}
                type="button"
                className={`week-chip ${isSelected ? 'active' : ''} ${
                  isCurrent ? 'current-week' : ''
                }`}
                onClick={() => setSelectedWeek(w)}
              >
                <span className="week-label">Week {w}</span>
                {isCurrent && <span className="current-dot" title="Current Active Week"></span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Guest Notice Banner if Not Authenticated */}
      {!isAuthenticated && (
        <div className="pwa-guest-banner">
          <div className="guest-banner-content">
            <span className="guest-banner-icon">👋</span>
            <span className="guest-banner-text">
              Browsing as guest. Sign in with <strong>WallyAuth</strong> to enter your Week{' '}
              {currentWeek} picks and track your record.
            </span>
          </div>
          <button type="button" className="guest-signin-btn" onClick={openAuthModal}>
            Sign In with WallyAuth
          </button>
        </div>
      )}

      {/* 3. MATRIX VIEW TABLE (Immediate top positioning) */}
      <main className="matrix-viewport">
        {isLoading && (
          <div className="matrix-loading-state">
            <div className="loading-spinner"></div>
            <p>Loading Week {selectedWeek} Matrix...</p>
          </div>
        )}

        {fetchError && (
          <div className="matrix-error-state">
            <p>⚠️ {fetchError}</p>
            <button onClick={() => fetchWeekMatrix(selectedWeek)} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {!isLoading && !fetchError && weekData && (
          <div className="matrix-table-container">
            <table className="matrix-table">
              <thead>
                <tr>
                  <th className="th-participant sticky-col">Participant</th>
                  <th className="th-score">Score</th>
                  {weekData.games.map((g) => {
                    const isStarted = g.is_started;
                    const isFinal = g.is_final;
                    return (
                      <th key={g.id} className="th-matchup">
                        <div className="matchup-header-cell">
                          <span className="matchup-teams">
                            {g.away_team} @ {g.home_team}
                          </span>
                          <span
                            className={`matchup-status-tag ${
                              isFinal ? 'final' : isStarted ? 'live' : 'sched'
                            }`}
                          >
                            {isFinal
                              ? `${g.away_score}-${g.home_score}`
                              : isStarted
                              ? 'LIVE'
                              : 'SCHED'}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="th-tiebreaker">Tiebreaker (MNF)</th>
                </tr>
              </thead>
              <tbody>
                {weekData.participants.map((p, idx) => {
                  return (
                    <tr
                      key={p.entry_id}
                      className={`participant-row ${p.is_me ? 'my-row' : ''} ${
                        idx % 2 === 0 ? 'even' : 'odd'
                      }`}
                    >
                      {/* Sticky Participant Name Column (Pure Text, Row Highlighted) */}
                      <td className="td-participant sticky-col">
                        <div className="participant-cell-wrap">
                          <span className="rank-num">#{idx + 1}</span>
                          <span className="participant-name">{p.username}</span>
                        </div>
                      </td>

                      {/* Correct Picks Score Column */}
                      <td className="td-score">
                        <div className="score-pill">
                          <span className="score-number">{p.correct_count}</span>
                          <span className="score-denom">/{p.graded_count}</span>
                        </div>
                      </td>

                      {/* Matchup Picks Columns (Text Badges, No Images) */}
                      {weekData.games.map((g) => {
                        const pick = p.picks[String(g.id)];
                        const selectedTeam = pick?.selected_team;
                        const isRevealed = pick?.is_revealed;
                        const result = pick?.result || 'pending';

                        if (!isRevealed) {
                          return (
                            <td key={g.id} className="td-pick">
                              <span className="pick-cell locked" title="Hidden until kickoff">
                                LOCKED
                              </span>
                            </td>
                          );
                        }

                        if (!selectedTeam) {
                          return (
                            <td key={g.id} className="td-pick">
                              <span className="cell-empty">—</span>
                            </td>
                          );
                        }

                        return (
                          <td key={g.id} className="td-pick">
                            <span className={`pick-cell ${result}`}>
                              {selectedTeam}
                            </span>
                          </td>
                        );
                      })}

                      {/* Tiebreaker Column */}
                      <td className="td-tiebreaker">
                        <span className="tiebreaker-val">
                          {p.mnf_points_prediction !== null ? p.mnf_points_prediction : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Pick-by-Pick Interactive Wizard Overlay */}
      {isWizardOpen && weekData && (
        <FootballPickWizard
          isOpen={isWizardOpen}
          week={selectedWeek}
          season={season}
          games={weekData.games}
          userPicks={weekData.current_user_status?.user_picks || {}}
          initialMnfPoints={weekData.current_user_status?.mnf_points || null}
          onClose={() => setIsWizardOpen(false)}
          onSaved={handlePicksSaved}
        />
      )}

      {/* 4. IN-PWA WALLYAUTH PROFILE & ACCOUNT MODAL */}
      {isAuthModalOpen && (
        <div className="auth-modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-modal-icon">🔐</div>
              <div>
                <h3 className="auth-modal-title">
                  {isAuthenticated ? 'Wally Account & Profile' : 'WallyAuth Access'}
                </h3>
                <span className="auth-modal-subtitle">
                  {isAuthenticated && currentUser
                    ? `Authenticated via ${weekData?.current_user_status?.auth_source || 'WallyAuth'}`
                    : 'Single Sign-On across all Wally Atkins apps'}
                </span>
              </div>
              <button
                className="auth-modal-close"
                onClick={() => setIsAuthModalOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="auth-modal-body">
              {/* If Authenticated: Profile Dashboard */}
              {isAuthenticated && currentUser ? (
                <div className="auth-section profile-dashboard-card">
                  <div className="profile-hero-row">
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.username}
                        className="profile-modal-avatar"
                      />
                    ) : (
                      <div className="profile-modal-avatar-fallback">
                        {currentUser.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="profile-meta">
                      <div className="profile-name-row">
                        <h4 className="profile-username">@{currentUser.username}</h4>
                        {currentUser.role === 'commissioner' && (
                          <span className="commish-badge">COMMISH</span>
                        )}
                      </div>
                      {currentUser.email && (
                        <span className="profile-email">{currentUser.email}</span>
                      )}
                      <span className="profile-status-badge">● Active Device Session</span>
                    </div>
                  </div>

                  <div className="profile-actions-stack">
                    <a
                      href="https://auth.wallyatkins.com/account"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-action-btn manage-account-btn"
                    >
                      <span>⚙️</span>
                      <span>Manage WallyAuth Profile &amp; Passkeys</span>
                      <span className="btn-external-icon">↗</span>
                    </a>

                    <button
                      type="button"
                      className="profile-action-btn logout-action-btn"
                      onClick={handleLogout}
                    >
                      <span>🚪</span>
                      <span>Sign Out from this Device</span>
                    </button>

                    {(currentUser.role === 'commissioner' ||
                      currentUser.role === 'admin' ||
                      currentUser.username === 'wallyatkins') && (
                      <button
                        type="button"
                        className="profile-action-btn metrics-action-btn"
                        onClick={() => {
                          setIsAuthModalOpen(false);
                          fetchPwaMetrics();
                          setIsMetricsModalOpen(true);
                        }}
                      >
                        <span>📊</span>
                        <span>PWA Installs &amp; User Metrics</span>
                      </button>
                    )}

                    {onSwitchToWebsite && (
                      <button
                        type="button"
                        className="profile-action-btn switch-site-btn"
                        onClick={() => {
                          setIsAuthModalOpen(false);
                          onSwitchToWebsite();
                        }}
                      >
                        <span>🌐</span>
                        <span>View Personal Website</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* If Not Authenticated: 1-Tap WallyAuth SSO Login */
                <div className="auth-section">
                  <span className="auth-section-label">WallyAuth Single Sign-On</span>
                  <a href={ssoRedirectUrl} className="auth-sso-btn">
                    <span>🔐</span>
                    <span>Sign in with WallyAuth SSO</span>
                  </a>
                  <p className="auth-hint">
                    Uses shared session across *.wallyatkins.com with passkey, OTP, or password.
                  </p>
                </div>
              )}

              {/* League Participant Switcher Grid (Available for testing / commissioner) */}
              <div className="auth-section">
                <span className="auth-section-label">Switch League Profile (Testing)</span>
                <div className="profile-switcher-grid">
                  {leagueUsers.map((u) => {
                    const isSelected = currentUser?.username === u.username;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        className={`profile-switch-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => handleSwitchUser(u.username)}
                        disabled={isSwitchingUser}
                      >
                        <span className="profile-dot"></span>
                        <span className="profile-name">{u.username}</span>
                        {isSelected && <span className="profile-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PWA Installs & Metrics Modal (Commissioner) */}
      {isMetricsModalOpen && (
        <div className="auth-modal-overlay" onClick={() => setIsMetricsModalOpen(false)}>
          <div className="auth-modal-card pwa-metrics-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-modal-icon">📱</div>
              <div>
                <h3 className="auth-modal-title">PWA Installs &amp; Metrics</h3>
                <span className="auth-modal-subtitle">Real-time installation &amp; device telemetry</span>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="metrics-refresh-btn"
                  onClick={fetchPwaMetrics}
                  disabled={isLoadingMetrics}
                  title="Refresh"
                >
                  {isLoadingMetrics ? '…' : '↻'}
                </button>
                <button
                  type="button"
                  className="auth-modal-close"
                  onClick={() => setIsMetricsModalOpen(false)}
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="auth-modal-body">
              {isLoadingMetrics && !metricsData ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
                  Loading installation telemetry...
                </div>
              ) : metricsData ? (
                <>
                  {/* Summary KPI Cards */}
                  <div className="metrics-kpi-grid">
                    <div className="metrics-kpi-card">
                      <span className="metrics-kpi-label">Total Installs</span>
                      <span className="metrics-kpi-val cyan">{metricsData.summary.total_installations}</span>
                      <span className="metrics-kpi-sub">Unique Devices</span>
                    </div>
                    <div className="metrics-kpi-card">
                      <span className="metrics-kpi-label">WallyAuth Users</span>
                      <span className="metrics-kpi-val green">{metricsData.summary.authenticated_installations}</span>
                      <span className="metrics-kpi-sub">Verified Accounts</span>
                    </div>
                    <div className="metrics-kpi-card">
                      <span className="metrics-kpi-label">Platforms</span>
                      <div className="metrics-platform-pills">
                        {metricsData.summary.platforms.map((p) => (
                          <span key={p.platform} className="platform-pill">
                            {p.platform === 'ios' ? '🍎 iOS' : p.platform === 'android' ? '🤖 Android' : '💻 ' + p.platform}: {p.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Installations List */}
                  <div className="auth-section">
                    <span className="auth-section-label">Installed App Instances ({metricsData.installations.length})</span>
                    <div className="metrics-installs-list">
                      {metricsData.installations.length === 0 ? (
                        <div style={{ padding: '1rem', color: '#64748b', textAlign: 'center' }}>
                          No installations recorded yet.
                        </div>
                      ) : (
                        metricsData.installations.map((inst) => {
                          const isIos = inst.platform === 'ios';
                          const isAndroid = inst.platform === 'android';
                          const icon = isIos ? '🍎' : isAndroid ? '🤖' : '💻';
                          const lastSeen = new Date(inst.last_seen_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          });

                          return (
                            <div key={inst.id} className="metrics-install-row">
                              <div className="install-avatar-box">
                                {inst.avatar_url ? (
                                  <img src={inst.avatar_url} alt="" className="metrics-avatar-img" />
                                ) : (
                                  <span className="metrics-avatar-fallback">{icon}</span>
                                )}
                              </div>
                              <div className="install-info">
                                <div className="install-name-line">
                                  <span className="install-username">
                                    {inst.username ? `@${inst.username}` : 'Guest / Not Logged In'}
                                  </span>
                                  {inst.display_mode === 'standalone' ? (
                                    <span className="install-badge standalone">PWA Installed</span>
                                  ) : (
                                    <span className="install-badge browser">Browser Visit</span>
                                  )}
                                  {inst.push_enabled === 1 && (
                                    <span className="install-badge push">🔔 Push Active</span>
                                  )}
                                </div>
                                <div className="install-subline">
                                  <span>{icon} {inst.platform.toUpperCase()} • {inst.browser || 'Browser'}</span>
                                  <span>• 🕒 {inst.timezone || 'America/New_York'}</span>
                                  <span>• {inst.launch_count} {inst.launch_count === 1 ? 'open' : 'opens'}</span>
                                  <span>• Active: {lastSeen}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  {metricsData.recent_activity.length > 0 && (
                    <div className="auth-section">
                      <span className="auth-section-label">Recent Activity Feed</span>
                      <div className="metrics-activity-list">
                        {metricsData.recent_activity.slice(0, 15).map((act) => {
                          const timeStr = new Date(act.created_at).toLocaleTimeString(undefined, {
                            hour: 'numeric',
                            minute: '2-digit',
                          });
                          return (
                            <div key={act.id} className="activity-item">
                              <span className="activity-dot">●</span>
                              <span className="activity-user">{act.username ? `@${act.username}` : 'Guest'}</span>
                              <span className="activity-event">{act.event_type}</span>
                              <span className="activity-time">{timeStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
                  Unable to load metrics. Ensure you are signed in as commissioner.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
