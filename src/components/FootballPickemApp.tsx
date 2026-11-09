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
        // Fallback default
        setAvailableWeeks([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        setSelectedWeek(9);
      }
    }

    fetchMeta();
  }, []);

  // 2. Fetch Matrix Data whenever selectedWeek changes
  useEffect(() => {
    if (!selectedWeek) return;

    let isMounted = true;
    setIsLoading(true);
    setFetchError(null);

    async function fetchWeekMatrix() {
      try {
        const res = await fetch(`/football_api.php?action=matrix&week=${selectedWeek}`);
        if (!res.ok) throw new Error(`Failed to load Week ${selectedWeek} matrix`);
        const data: WeekDataResponse = await res.json();

        if (isMounted) {
          setWeekData(data);
          setIsLoading(false);

          // Auto-launch into Pick-by-Pick Flow if user has NOT put in picks for the CURRENT week!
          if (
            data.is_current_week &&
            !hasAutoLaunchedRef.current &&
            (!data.current_user_status.has_submitted || data.current_user_status.missing_picks)
          ) {
            hasAutoLaunchedRef.current = true;
            setIsWizardOpen(true);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Error loading matrix';
          setFetchError(msg);
          setIsLoading(false);
        }
      }
    }

    fetchWeekMatrix();

    return () => {
      isMounted = false;
    };
  }, [selectedWeek]);

  const handlePicksSaved = (newPicks: Record<number, string>, mnfPts: number | null) => {
    // Refresh week data to show updated matrix
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

    // Refetch freshly from server to update participant rows
    fetch(`/football_api.php?action=matrix&week=${selectedWeek}`)
      .then((r) => r.json())
      .then((fresh) => setWeekData(fresh))
      .catch(() => {});
  };

  const currentUser = weekData?.current_user_status?.user;
  const isCurrentWeekSelected = selectedWeek === currentWeek;
  const userMissingPicks =
    weekData?.current_user_status?.missing_picks || !weekData?.current_user_status?.has_submitted;

  return (
    <div className="football-pwa-container">
      {/* PWA Auto-Updating Alert Banner */}
      {isUpdating && (
        <div className="pwa-auto-update-toast">
          <span className="pulse-dot"></span>
          <span>Updating NFL Pool to the latest version...</span>
        </div>
      )}

      {/* Main App Top Navigation Bar */}
      <header className="football-header">
        <div className="football-header-left">
          <div className="nfl-brand-badge">
            <span className="football-emoji">🏈</span>
            <div className="brand-titles">
              <h1 className="league-title">Atkins NFL Pool</h1>
              <span className="season-subtitle">{season} Regular Season</span>
            </div>
          </div>
        </div>

        <div className="football-header-right">
          {/* Native Install Button */}
          {canInstall && !isStandalone && (
            <button className="pwa-header-install-btn" onClick={installApp}>
              📱 Install App
            </button>
          )}

          {/* User Profile / Login */}
          {currentUser ? (
            <div className="user-profile-pill">
              <span className="user-avatar-dot"></span>
              <span className="user-name">{currentUser.username}</span>
              {currentUser.role === 'commissioner' && (
                <span className="commish-badge">COMMISH</span>
              )}
            </div>
          ) : (
            <a
              href="https://football.wallyatkins.com/auth/login?redirect=https://wallyatkins.com"
              className="login-pill"
            >
              Sign In ↗
            </a>
          )}
        </div>
      </header>

      {/* 1. HORIZONTAL WEEKS SLIDER */}
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
                {isCurrent && <span className="current-dot" title="Current Week"></span>}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Action / Status Bar */}
      <section className="week-action-bar">
        <div className="week-action-info">
          <h2 className="week-heading">
            Week {selectedWeek} Picks Matrix
            {isCurrentWeekSelected && <span className="active-pill">CURRENT WEEK</span>}
          </h2>
          <span className="games-count-pill">
            {weekData?.games?.length || 0} Matchups
          </span>
        </div>

        <div className="week-action-buttons">
          {isCurrentWeekSelected && (
            <button
              type="button"
              className={`launch-wizard-cta ${userMissingPicks ? 'pulse-cta' : ''}`}
              onClick={() => setIsWizardOpen(true)}
            >
              <span className="cta-icon">⚡</span>
              <span>{userMissingPicks ? 'Enter Your Week ' + selectedWeek + ' Picks' : 'Review / Edit My Picks'}</span>
            </button>
          )}

          {/* Quick jump to current week if viewing past week */}
          {!isCurrentWeekSelected && (
            <button
              type="button"
              className="jump-current-btn"
              onClick={() => setSelectedWeek(currentWeek)}
            >
              Jump to Current Week {currentWeek} →
            </button>
          )}
        </div>
      </section>

      {/* 2. MATRIX VIEW TABLE */}
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
            <button onClick={() => setSelectedWeek(selectedWeek)} className="retry-btn">
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
                          <span className={`matchup-status-tag ${isFinal ? 'final' : isStarted ? 'live' : 'sched'}`}>
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
                      className={`participant-row ${p.is_me ? 'my-row' : ''} ${idx % 2 === 0 ? 'even' : 'odd'}`}
                    >
                      {/* Sticky Participant Name */}
                      <td className="td-participant sticky-col">
                        <div className="participant-cell-wrap">
                          <span className="rank-num">#{idx + 1}</span>
                          <span className="participant-name">{p.username}</span>
                          {p.is_me && <span className="you-tag">YOU</span>}
                        </div>
                      </td>

                      {/* Correct / Graded Score */}
                      <td className="td-score">
                        <span className="score-badge">
                          {p.correct_count} / {p.graded_count}
                        </span>
                      </td>

                      {/* Pick Cells for each Game */}
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
                              <span className="cell-locked-pill">🔒</span>
                            ) : selectedTeam ? (
                              <span className={cellClass}>
                                {selectedTeam}
                              </span>
                            ) : (
                              <span className="cell-empty">—</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Tiebreaker MNF Points */}
                      <td className="td-tiebreaker">
                        <span className="mnf-pts-pill">
                          {p.mnf_points_prediction !== null ? `${p.mnf_points_prediction} pts` : '—'}
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

      {/* 3. PICK-BY-PICK WIZARD MODAL */}
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
    </div>
  );
};
