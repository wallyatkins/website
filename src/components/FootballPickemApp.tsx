import React, { useState, useEffect, useRef } from 'react';
import { usePWA } from '../hooks/usePWA';
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

  const hasAutoLaunchedRef = useRef<boolean>(false);

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

      {/* 2. HORIZONTAL WEEKS SLIDER (Right at top) */}
      <nav className="weeks-slider-wrapper" aria-label="NFL Weeks Navigation">
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
                      {/* Sticky Participant Name Column (Pure Text, No Images) */}
                      <td className="td-participant sticky-col">
                        <div className="participant-cell-wrap">
                          <span className="rank-num">#{idx + 1}</span>
                          <span className="participant-name">{p.username}</span>
                          {p.is_me && <span className="you-tag">YOU</span>}
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
    </div>
  );
};
