import React, { useState, useEffect } from 'react';

export interface FootballGame {
  id: number;
  home_team: string;
  away_team: string;
  home_name: string;
  away_name: string;
  home_nick: string;
  away_nick: string;
  home_color: string;
  away_color: string;
  home_color2?: string;
  away_color2?: string;
  home_logo: string;
  away_logo: string;
  kickoff_time: string;
  kickoff_timestamp: number;
  is_mnf: boolean;
  status: string;
  home_score: number | null;
  away_score: number | null;
  is_started: boolean;
  is_locked: boolean;
  is_final: boolean;
  winning_team: string | null;
}

interface PickWizardProps {
  games: FootballGame[];
  userPicks: Record<number, string>;
  initialMnfPoints: number | null;
  week: number;
  season: number;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (picks: Record<number, string>, mnfPoints: number | null) => void;
}

export const FootballPickWizard: React.FC<PickWizardProps> = ({
  games,
  userPicks,
  initialMnfPoints,
  week,
  season,
  isOpen,
  onClose,
  onSaved,
}) => {
  const [picks, setPicks] = useState<Record<number, string>>(userPicks);
  const [mnfPoints, setMnfPoints] = useState<number | string>(initialMnfPoints ?? 48);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setPicks(userPicks);
    if (initialMnfPoints !== null) {
      setMnfPoints(initialMnfPoints);
    }
  }, [userPicks, initialMnfPoints]);

  if (!isOpen) return null;

  const totalGames = games.length;
  const isTiebreakerStep = currentIndex === totalGames;
  const currentGame = !isTiebreakerStep ? games[currentIndex] : null;

  const pickedCount = Object.keys(picks).length;
  const progressPct = totalGames > 0 ? Math.round((pickedCount / totalGames) * 100) : 0;

  const handleSelectTeam = (team: string) => {
    if (!currentGame || currentGame.is_locked) return;

    setPicks((prev) => ({
      ...prev,
      [currentGame.id]: team,
    }));

    // Auto-advance to next game or tiebreaker step after short visual feedback
    setTimeout(() => {
      if (currentIndex < totalGames) {
        setCurrentIndex((prev) => prev + 1);
      }
    }, 220);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalGames) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSaveError(null);

    const payload = {
      week,
      season,
      picks,
      mnf_prediction: mnfPoints !== '' ? Number(mnfPoints) : null,
    };

    try {
      const res = await fetch('/football_api.php?action=save_picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save picks');
      }

      setSaveSuccess(true);
      setTimeout(() => {
        onSaved(picks, mnfPoints !== '' ? Number(mnfPoints) : null);
        onClose();
        setSaveSuccess(false);
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error submitting picks';
      setSaveError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatKickoff = (isoTime: string) => {
    try {
      const d = new Date(isoTime);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return isoTime;
    }
  };

  return (
    <div className="wizard-overlay">
      <div className="wizard-modal">
        {/* Wizard Header */}
        <div className="wizard-header">
          <div className="wizard-title-group">
            <span className="wizard-badge">Week {week} Pick Flow</span>
            <h2 className="wizard-title">
              {isTiebreakerStep ? 'Tiebreaker Point Prediction' : `Game ${currentIndex + 1} of ${totalGames}`}
            </h2>
          </div>
          <button className="wizard-close-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        <div className="wizard-progress-track">
          <div className="wizard-progress-fill" style={{ width: `${progressPct}%` }}></div>
        </div>
        <div className="wizard-progress-text">
          <span>{pickedCount} of {totalGames} Picks Made</span>
          <span>{progressPct}% Complete</span>
        </div>

        {/* Wizard Body */}
        <div className="wizard-body">
          {!isTiebreakerStep && currentGame && (
            <div className="matchup-step">
              <div className="matchup-meta">
                <span className="matchup-time">⏰ {formatKickoff(currentGame.kickoff_time)}</span>
                {currentGame.is_mnf && <span className="mnf-badge">🔥 Monday Night Football</span>}
                {currentGame.is_locked && <span className="locked-pill">🔒 Game Started / Locked</span>}
              </div>

              {/* Matchup Team Selection Cards */}
              <div className="team-cards-grid">
                {/* Away Team */}
                <button
                  type="button"
                  className={`team-card ${picks[currentGame.id] === currentGame.away_team ? 'selected' : ''} ${currentGame.is_locked ? 'disabled' : ''}`}
                  onClick={() => handleSelectTeam(currentGame.away_team)}
                  disabled={currentGame.is_locked}
                  style={{
                    borderColor: picks[currentGame.id] === currentGame.away_team ? currentGame.away_color : undefined,
                  }}
                >
                  <div className="team-logo-wrap">
                    <img
                      src={currentGame.away_logo}
                      alt={currentGame.away_name}
                      className="team-logo"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="team-details">
                    <span className="team-sub">AWAY</span>
                    <h3 className="team-name">{currentGame.away_name}</h3>
                    <span className="team-abbr">{currentGame.away_team}</span>
                  </div>
                  <div className="pick-indicator">
                    {picks[currentGame.id] === currentGame.away_team ? '✓ SELECTED' : 'TAP TO PICK'}
                  </div>
                </button>

                <div className="matchup-vs">@</div>

                {/* Home Team */}
                <button
                  type="button"
                  className={`team-card ${picks[currentGame.id] === currentGame.home_team ? 'selected' : ''} ${currentGame.is_locked ? 'disabled' : ''}`}
                  onClick={() => handleSelectTeam(currentGame.home_team)}
                  disabled={currentGame.is_locked}
                  style={{
                    borderColor: picks[currentGame.id] === currentGame.home_team ? currentGame.home_color : undefined,
                  }}
                >
                  <div className="team-logo-wrap">
                    <img
                      src={currentGame.home_logo}
                      alt={currentGame.home_name}
                      className="team-logo"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="team-details">
                    <span className="team-sub">HOME</span>
                    <h3 className="team-name">{currentGame.home_name}</h3>
                    <span className="team-abbr">{currentGame.home_team}</span>
                  </div>
                  <div className="pick-indicator">
                    {picks[currentGame.id] === currentGame.home_team ? '✓ SELECTED' : 'TAP TO PICK'}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Tiebreaker Step */}
          {isTiebreakerStep && (
            <div className="tiebreaker-step">
              <div className="tb-icon">🎯</div>
              <h3 className="tb-title">Monday Night Tiebreaker</h3>
              <p className="tb-desc">
                Predict the <strong>combined total points scored</strong> in Monday Night Football.
                Used to break first-place weekly ties!
              </p>

              <div className="tb-input-wrapper">
                <button
                  type="button"
                  className="tb-step-btn"
                  onClick={() => setMnfPoints((prev) => Math.max(0, Number(prev || 0) - 1))}
                >
                  -1
                </button>
                <input
                  type="number"
                  className="tb-number-input"
                  value={mnfPoints}
                  onChange={(e) => setMnfPoints(e.target.value)}
                  min="0"
                  max="120"
                />
                <button
                  type="button"
                  className="tb-step-btn"
                  onClick={() => setMnfPoints((prev) => Number(prev || 0) + 1)}
                >
                  +1
                </button>
              </div>

              <div className="tb-quick-presets">
                <span className="preset-label">Quick Presets:</span>
                {[41, 44, 47, 51, 54].map((pts) => (
                  <button
                    key={pts}
                    type="button"
                    className={`preset-btn ${Number(mnfPoints) === pts ? 'active' : ''}`}
                    onClick={() => setMnfPoints(pts)}
                  >
                    {pts}
                  </button>
                ))}
              </div>

              {/* Review summary */}
              <div className="review-summary">
                <div className="review-stat">
                  <span>Picks Selected:</span>
                  <strong>{pickedCount} of {totalGames}</strong>
                </div>
                <div className="review-stat">
                  <span>Tiebreaker Prediction:</span>
                  <strong>{mnfPoints} Points</strong>
                </div>
              </div>

              {saveError && <div className="wizard-error-banner">{saveError}</div>}
              {saveSuccess && <div className="wizard-success-banner">✓ Picks Saved Successfully! Updating Matrix...</div>}
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="wizard-footer">
          <button
            type="button"
            className="wizard-nav-btn prev"
            onClick={handlePrev}
            disabled={currentIndex === 0}
          >
            ← Previous
          </button>

          {!isTiebreakerStep ? (
            <button
              type="button"
              className="wizard-nav-btn next"
              onClick={handleNext}
            >
              {currentIndex === totalGames - 1 ? 'Go to Tiebreaker →' : 'Next Game →'}
            </button>
          ) : (
            <button
              type="button"
              className="wizard-submit-btn"
              onClick={handleSubmit}
              disabled={isSubmitting || saveSuccess}
            >
              {isSubmitting ? 'Locking in Picks...' : saveSuccess ? '✓ Saved!' : '⚡ Lock In My Picks'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
