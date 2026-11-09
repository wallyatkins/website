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

interface CurrentUserStatus {
  is_authenticated: boolean;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  } | null;
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

export const FootballPickemApp: React.FC = () => {
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
    async function fetchMeta() {
      try {
        const res = await fetch('/football_api.php?action=meta');
        if (!res.ok) throw new Error('Failed to load pool meta');
        const data = await res.json();

        setSeason(data.season);
        setCurrentWeek(data.current_week);
        setAvailableWeeks(data.available_weeks);
        setSelectedWeek(data.current_week);
      } catch (err: unknown) {
        console.warn('Meta fetch error:', err);
        setAvailableWeeks([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        setSelectedWeek(9);
      }
    }

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
      // 3. User is authenticated
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
  const isCurrentWeekSelected = selectedWeek === currentWeek;
  const userMissingPicks =
    weekData?.current_user_status?.missing_picks || !weekData?.current_user_status?.has_submitted;

  return (
    <div className="football-pwa-container">
      {/* PWA Auto-Updating Alert Toast */}
      {isUpdating && (
        <div className="pwa-auto-update-toast">
          <span className="pulse-dot"></span>
          <span>Updating NFL Pool to the latest version...</span>
        </div>
      )}

      {/* Slim Top Header */}
      <header className="football-header">
        <div className="football-header-left">
          <div className="nfl-brand-badge">
            <span className="football-emoji">🏈</span>
            <div className="brand-titles">
              <h1 className="league-title">Atkins NFL Pool</h1>
              <span className="season-subtitle">
                {season} • Week {selectedWeek}
              </span>
            </div>
          </div>
        </div>

        <div className="football-header-right">
          {/* Action to edit picks if on current week */}
          {isCurrentWeekSelected && (
            <button
              type="button"
              className={`compact-pick-btn ${userMissingPicks ? 'pulse-cta' : ''}`}
              onClick={() => setIsWizardOpen(true)}
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

          {/* User Profile / In-PWA Auth Button */}
          {currentUser ? (
            <button
              type="button"
              className="user-profile-pill clickable"
              onClick={openAuthModal}
              title="Click to switch profile or view account"
            >
              <span className="user-avatar-dot"></span>
              <span className="user-name">{currentUser.username}</span>
              {currentUser.role === 'commissioner' && (
                <span className="commish-badge">COMMISH</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="login-pill"
              onClick={openAuthModal}
            >
              🔐 Sign In
            </button>
          )}
        </div>
      </header>

      {/* 1. HORIZONTAL WEEKS SLIDER (Right at top) */}
      <nav className="weeks-slider-wrapper" aria-label="NFL Weeks Navigation">
        <div className="weeks-slider">
          {availableWeeks.map((w) => {
            const isCurrent = w === currentWeek;
            const isSelected = w === selectedWeek;
            return (
              <button
                key={w}
                type="button"
                className={`week-chip ${isSelected ? 'active' : ''} ${isCurrent ? 'current-week' : ''}`}
                onClick={() => setSelectedWeek(w)}
              >
                <span className="week-label">Week {w}</span>
                {isCurrent && <span className="current-dot" title="Current Active Week"></span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 2. MATRIX VIEW TABLE (Immediate top positioning) */}
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
                      {/* Sticky Participant Name Column */}
                      <td className="td-participant sticky-col">
                        <div className="participant-cell-wrap">
                          <span className="rank-num">#{idx + 1}</span>
                          <span className="participant-name">{p.username}</span>
                          {p.is_me && <span className="you-tag">YOU</span>}
                        </div>
                      </td>

                      {/* Correct / Graded Score Column */}
                      <td className="td-score">
                        <span className="score-badge">
                          {p.correct_count} / {p.graded_count}
                        </span>
                      </td>

                      {/* Pick Cells for each Matchup */}
                      {weekData.games.map((g) => {
                        const pickData = p.picks[String(g.id)];
                        const isRevealed = pickData?.is_revealed ?? false;
                        const selectedTeam = pickData?.selected_team;
                        const result = pickData?.result ?? 'pending';

                        let cellClass = 'pick-cell pending';
                        if (result === 'correct') {
                          cellClass = 'pick-cell correct';
                        } else if (result === 'incorrect') {
                          cellClass = 'pick-cell incorrect';
                        } else if (!isRevealed) {
                          cellClass = 'pick-cell locked';
                        }

                        return (
                          <td key={g.id} className="td-pick">
                            {!isRevealed ? (
                              <span className="cell-locked-pill" title="Locked until kickoff">
                                🔒
                              </span>
                            ) : selectedTeam ? (
                              <span className={cellClass}>{selectedTeam}</span>
                            ) : (
                              <span className="cell-empty">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Tiebreaker Monday Night Points */}
                      <td className="td-tiebreaker">
                        <span className="mnf-pts-pill">
                          {p.mnf_points_prediction !== null
                            ? `${p.mnf_points_prediction} pts`
                            : '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {weekData.participants.length === 0 && (
                  <tr>
                    <td
                      colSpan={weekData.games.length + 3}
                      className="empty-participants-cell"
                    >
                      No picks submitted for Week {selectedWeek} yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* 3. PICK-BY-PICK WIZARD MODAL (Only opens when requested or missing picks on current week) */}
      {weekData && (
        <FootballPickWizard
          games={weekData.games}
          userPicks={weekData.current_user_status.user_picks}
          initialMnfPoints={weekData.current_user_status.mnf_points}
          week={selectedWeek}
          season={season}
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          onSaved={handlePicksSaved}
        />
      )}

      {/* 4. IN-PWA SEAMLESS AUTH MODAL */}
      {isAuthModalOpen && (
        <div className="auth-modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <div className="auth-modal-icon">🔐</div>
              <div>
                <h3 className="auth-modal-title">League Account &amp; Access</h3>
                <span className="auth-modal-subtitle">
                  {currentUser ? `Signed in as @${currentUser.username}` : 'Not signed in'}
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
              {/* Option 1: WallyAuth SSO Single Sign-On */}
              <div className="auth-section">
                <span className="auth-section-label">WallyAuth Single Sign-On</span>
                <a
                  href="https://football.wallyatkins.com/auth/login?redirect=https://wallyatkins.com/"
                  className="auth-sso-btn"
                >
                  <span>🔐</span>
                  <span>Sign in with WallyAuth SSO</span>
                </a>
                <p className="auth-hint">
                  Keeps you securely logged in across all *.wallyatkins.com apps.
                </p>
              </div>

              {/* Option 2: Quick League Profile Switcher */}
              <div className="auth-section">
                <span className="auth-section-label">Select League Profile</span>
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
