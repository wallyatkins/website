import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useEasterEgg } from '../../context/EasterEggContext';

interface Cell {
    row: number;
    col: number;
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    adjacentMines: number;
    isBlown?: boolean;
    isRadarScanned?: boolean;
}

type Difficulty = 'BLITZ' | 'CLASSIC_2003' | 'TURBO' | 'CHAOS';

interface DifficultyConfig {
    name: string;
    rows: number;
    cols: number;
    mines: number;
    badge: string;
}

const CONFIGS: Record<Difficulty, DifficultyConfig> = {
    BLITZ: { name: 'Blitz', rows: 8, cols: 8, mines: 8, badge: '⚡ Quick Arcade' },
    CLASSIC_2003: { name: '2003 Tribute', rows: 9, cols: 9, mines: 10, badge: '🕹️ Cavalier 2003' },
    TURBO: { name: 'Turbo Neon', rows: 12, cols: 12, mines: 22, badge: '💎 Bling Master' },
    CHAOS: { name: 'Chaos Grid', rows: 16, cols: 16, mines: 40, badge: '🔥 Hardcore' },
};

// Web Audio API Procedural Synthesizer (Zero External Assets)
class SoundFX {
    private ctx: AudioContext | null = null;
    public enabled = true;

    private getContext(): AudioContext | null {
        if (!this.enabled) return null;
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
        return this.ctx;
    }

    playReveal(pitchStep = 0) {
        const ctx = this.getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const baseFreq = 340 + Math.min(pitchStep * 35, 600);
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.08);

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
    }

    playFlag() {
        const ctx = this.getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.04);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
    }

    playShield() {
        const ctx = this.getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }

    playRadar() {
        const ctx = this.getContext();
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6
        osc.frequency.exponentialRampToValueAtTime(523.25, ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.35);
    }

    playExplosion() {
        const ctx = this.getContext();
        if (!ctx) return;
        // White noise buffer for detonation crunch
        const bufferSize = ctx.sampleRate * 0.4;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.4);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        noise.start();
    }

    playVictory() {
        const ctx = this.getContext();
        if (!ctx) return;
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime + idx * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.2);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + idx * 0.1);
            osc.stop(ctx.currentTime + idx * 0.1 + 0.2);
        });
    }
}

const sfx = new SoundFX();

export const Minesweeper: React.FC = () => {
    const { isGameUnlocked, activeGame, returnToMenu } = useEasterEgg();

    const [difficulty, setDifficulty] = useState<Difficulty>('CLASSIC_2003');
    const [grid, setGrid] = useState<Cell[][]>([]);
    const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');
    const [mineCount, setMineCount] = useState(CONFIGS.CLASSIC_2003.mines);
    const [flagCount, setFlagCount] = useState(0);
    const [timer, setTimer] = useState(0);
    const [firstClick, setFirstClick] = useState(true);
    const [mineShield, setMineShield] = useState(true);
    const [radarCharges, setRadarCharges] = useState(1);
    const [score, setScore] = useState(0);
    const [combo, setCombo] = useState(1);
    const [highScore, setHighScore] = useState(() => {
        const saved = localStorage.getItem('neomines_highscore');
        return saved ? parseInt(saved, 10) : 0;
    });

    const [screenShake, setScreenShake] = useState(false);
    const [soundMuted, setSoundMuted] = useState(false);
    const [crtScanlines, setCrtScanlines] = useState(true);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [floatingNotice, setFloatingNotice] = useState<string | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Initialize board
    const initBoard = useCallback((diff: Difficulty) => {
        const config = CONFIGS[diff];
        const newGrid: Cell[][] = [];
        for (let r = 0; r < config.rows; r++) {
            const row: Cell[] = [];
            for (let c = 0; c < config.cols; c++) {
                row.push({
                    row: r,
                    col: c,
                    isMine: false,
                    isRevealed: false,
                    isFlagged: false,
                    adjacentMines: 0,
                });
            }
            newGrid.push(row);
        }
        setGrid(newGrid);
        setMineCount(config.mines);
        setFlagCount(0);
        setTimer(0);
        setGameStatus('IDLE');
        setFirstClick(true);
        setMineShield(true);
        setRadarCharges(1);
        setCombo(1);
        setScore(0);
        if (timerRef.current) clearInterval(timerRef.current);
    }, []);

    useEffect(() => {
        if (isGameUnlocked && activeGame === 'MINESWEEPER') {
            initBoard(difficulty);
        }
    }, [isGameUnlocked, activeGame, difficulty, initBoard]);

    // Timer effect
    useEffect(() => {
        if (gameStatus === 'PLAYING') {
            timerRef.current = setInterval(() => {
                setTimer((t) => t + 1);
            }, 1000);
        } else if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameStatus]);

    // Plant mines with first-click protection (safe 3x3 surrounding zone)
    const plantMines = (startRow: number, startCol: number, currentGrid: Cell[][]): Cell[][] => {
        const config = CONFIGS[difficulty];
        const rows = config.rows;
        const cols = config.cols;
        const nextGrid = currentGrid.map((r) => r.map((c) => ({ ...c })));

        let planted = 0;
        while (planted < config.mines) {
            const r = Math.floor(Math.random() * rows);
            const c = Math.floor(Math.random() * cols);

            // Exclude clicked cell and immediate 3x3 neighborhood
            const isNearStart = Math.abs(r - startRow) <= 1 && Math.abs(c - startCol) <= 1;
            if (!nextGrid[r][c].isMine && !isNearStart) {
                nextGrid[r][c].isMine = true;
                planted++;
            }
        }

        // Calculate adjacency numbers
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (nextGrid[r][c].isMine) continue;
                let count = 0;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        const nr = r + dr;
                        const nc = c + dc;
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && nextGrid[nr][nc].isMine) {
                            count++;
                        }
                    }
                }
                nextGrid[r][c].adjacentMines = count;
            }
        }

        return nextGrid;
    };

    // Trigger floating message
    const triggerNotice = (msg: string) => {
        setFloatingNotice(msg);
        setTimeout(() => setFloatingNotice(null), 1800);
    };

    // Trigger screen shake
    const triggerShake = () => {
        setScreenShake(true);
        setTimeout(() => setScreenShake(false), 450);
    };

    // Check click handler
    const handleClick = (row: number, col: number) => {
        if (gameStatus === 'LOST' || gameStatus === 'WON') return;

        let workingGrid = grid;
        if (firstClick) {
            workingGrid = plantMines(row, col, grid);
            setFirstClick(false);
            setGameStatus('PLAYING');
        }

        const cell = workingGrid[row][col];
        if (cell.isRevealed || cell.isFlagged) return;

        // Hit a mine!
        if (cell.isMine) {
            if (mineShield) {
                // Shield saves the player!
                setMineShield(false);
                triggerShake();
                sfx.playShield();
                triggerNotice('🛡️ MINE SHIELD ABSORBED BLAST!');
                const nextGrid = workingGrid.map((r) => r.map((c) => ({ ...c })));
                nextGrid[row][col].isFlagged = true; // Auto-flag neutralized mine
                setFlagCount((fc) => fc + 1);
                setGrid(nextGrid);
                return;
            }

            // Game Over
            triggerShake();
            sfx.playExplosion();
            const nextGrid = workingGrid.map((r) =>
                r.map((c) => {
                    if (c.isMine) return { ...c, isRevealed: true, isBlown: c.row === row && c.col === col };
                    return c;
                })
            );
            setGrid(nextGrid);
            setGameStatus('LOST');
            return;
        }

        // Safe reveal with recursive zero cascade
        const nextGrid = workingGrid.map((r) => r.map((c) => ({ ...c })));
        let revealedCount = 0;

        const revealRecursive = (r: number, c: number) => {
            if (r < 0 || r >= CONFIGS[difficulty].rows || c < 0 || c >= CONFIGS[difficulty].cols) return;
            const target = nextGrid[r][c];
            if (target.isRevealed || target.isFlagged || target.isMine) return;

            target.isRevealed = true;
            revealedCount++;

            if (target.adjacentMines === 0) {
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr !== 0 || dc !== 0) {
                            revealRecursive(r + dr, c + dc);
                        }
                    }
                }
            }
        };

        revealRecursive(row, col);

        // Sound & combo calculation
        sfx.playReveal(Math.min(revealedCount, 8));
        const newCombo = revealedCount > 4 ? combo + 1 : 1;
        setCombo(newCombo);

        const earnedPoints = revealedCount * 25 * newCombo;
        const newScore = score + earnedPoints;
        setScore(newScore);

        if (newScore > highScore) {
            setHighScore(newScore);
            localStorage.setItem('neomines_highscore', newScore.toString());
        }

        if (revealedCount >= 8) {
            triggerNotice(`🔥 CASCADE COMBO! +${earnedPoints}`);
        }

        // Award radar charge every 15 reveals
        if (revealedCount > 6 && Math.random() > 0.6) {
            setRadarCharges((rc) => Math.min(rc + 1, 3));
        }

        setGrid(nextGrid);

        // Check Victory
        const totalSafeCells = CONFIGS[difficulty].rows * CONFIGS[difficulty].cols - CONFIGS[difficulty].mines;
        let totalRevealed = 0;
        for (let r = 0; r < CONFIGS[difficulty].rows; r++) {
            for (let c = 0; c < CONFIGS[difficulty].cols; c++) {
                if (nextGrid[r][c].isRevealed) totalRevealed++;
            }
        }

        if (totalRevealed === totalSafeCells) {
            setGameStatus('WON');
            sfx.playVictory();
            confetti({
                particleCount: 150,
                spread: 80,
                origin: { y: 0.6 },
                colors: ['#38bdf8', '#f59e0b', '#ec4899', '#10b981'],
            });
        }
    };

    // Right-click flag handler
    const handleRightClick = (e: React.MouseEvent, row: number, col: number) => {
        e.preventDefault();
        if (gameStatus === 'LOST' || gameStatus === 'WON') return;
        const cell = grid[row][col];
        if (cell.isRevealed) return;

        sfx.playFlag();
        const nextGrid = grid.map((r) => r.map((c) => ({ ...c })));
        const target = nextGrid[row][col];
        target.isFlagged = !target.isFlagged;
        setGrid(nextGrid);
        setFlagCount((fc) => (target.isFlagged ? fc + 1 : fc - 1));
    };

    // Radar Scan Power-up (reveals 3x3 mine-safe cells)
    const useRadar = () => {
        if (radarCharges <= 0 || gameStatus === 'LOST' || gameStatus === 'WON') return;
        setRadarCharges((rc) => rc - 1);
        sfx.playRadar();
        triggerNotice('🔍 RADAR PING ACTIVE!');

        // Find a random safe unrevealed cell
        const safeCandidates: { r: number; c: number }[] = [];
        grid.forEach((row, r) => {
            row.forEach((cell, c) => {
                if (!cell.isMine && !cell.isRevealed) {
                    safeCandidates.push({ r, c });
                }
            });
        });

        if (safeCandidates.length > 0) {
            const picked = safeCandidates[Math.floor(Math.random() * safeCandidates.length)];
            handleClick(picked.r, picked.c);
        }
    };

    if (!isGameUnlocked || activeGame !== 'MINESWEEPER') return null;

    const remainingMines = mineCount - flagCount;

    return (
        <div className={`neomines-arcade-overlay ${screenShake ? 'screen-shake' : ''} ${crtScanlines ? 'crt-scanlines' : ''}`}>
            {/* Background ambient neon glow */}
            <div className="arcade-glow" />

            <div className="neomines-container">
                {/* Header Toolbar */}
                <div className="arcade-header">
                    <div className="header-left">
                        <button className="arcade-btn-icon" onClick={returnToMenu} title="Return to Game Menu">
                            ← MENU
                        </button>
                        <button
                            className="arcade-btn-icon"
                            onClick={() => {
                                sfx.enabled = soundMuted;
                                setSoundMuted(!soundMuted);
                            }}
                            title="Toggle Sound"
                        >
                            {soundMuted ? '🔇 MUTE' : '🔊 SFX'}
                        </button>
                        <button
                            className="arcade-btn-icon"
                            onClick={() => setCrtScanlines(!crtScanlines)}
                            title="Toggle CRT Scanline Effect"
                        >
                            📺 CRT: {crtScanlines ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    <div className="header-title">
                        <span className="title-diamond">💎</span>
                        <h2>NEO-MINES</h2>
                        <span className="title-sub">TURBO BLING EDITION</span>
                    </div>

                    <div className="header-right">
                        <button className="arcade-btn-gold" onClick={() => setIsHistoryOpen(true)}>
                            📜 THE 20-YEAR STORY
                        </button>
                        <div className="arcade-close" onClick={returnToMenu}>
                            &times;
                        </div>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="arcade-dashboard">
                    <div className="stat-card">
                        <span className="stat-label">MINES</span>
                        <span className="stat-val neon-pink">
                            💣 {remainingMines.toString().padStart(2, '0')}
                        </span>
                    </div>

                    <div className="stat-card">
                        <span className="stat-label">TIME</span>
                        <span className="stat-val neon-cyan">⏱️ {timer.toString().padStart(3, '0')}s</span>
                    </div>

                    <div className="stat-card">
                        <span className="stat-label">SCORE</span>
                        <span className="stat-val neon-gold">🏆 {score.toLocaleString()}</span>
                    </div>

                    <div className="stat-card">
                        <span className="stat-label">COMBO</span>
                        <span className="stat-val neon-green">⚡ x{combo}</span>
                    </div>

                    <div className="stat-card perks-card">
                        <button
                            className={`perk-btn ${radarCharges > 0 ? 'perk-ready' : 'perk-empty'}`}
                            onClick={useRadar}
                            disabled={radarCharges <= 0}
                            title="Reveal safe cell zone"
                        >
                            🔍 RADAR ({radarCharges})
                        </button>
                        <div className={`perk-badge ${mineShield ? 'shield-on' : 'shield-off'}`} title="1-time blast absorption">
                            🛡️ {mineShield ? 'SHIELD READY' : 'SHIELD BROKEN'}
                        </div>
                    </div>
                </div>

                {/* Difficulty Selector */}
                <div className="difficulty-bar">
                    {(Object.keys(CONFIGS) as Difficulty[]).map((diff) => (
                        <button
                            key={diff}
                            className={`diff-btn ${difficulty === diff ? 'active' : ''}`}
                            onClick={() => {
                                setDifficulty(diff);
                                initBoard(diff);
                            }}
                        >
                            {CONFIGS[diff].badge}
                        </button>
                    ))}
                    <button className="reset-btn" onClick={() => initBoard(difficulty)}>
                        🔄 NEW GAME
                    </button>
                </div>

                {/* Main Game Grid Container */}
                <div className="grid-outer-frame">
                    {floatingNotice && <div className="floating-banner">{floatingNotice}</div>}

                    {/* Game Over / Win Overlay */}
                    {gameStatus === 'LOST' && (
                        <div className="endgame-modal lose">
                            <h3>💥 DETONATED!</h3>
                            <p>You triggered an active plasma mine!</p>
                            <div className="endgame-stats">Score: {score.toLocaleString()}</div>
                            <button className="arcade-btn-primary" onClick={() => initBoard(difficulty)}>
                                TRY AGAIN
                            </button>
                        </div>
                    )}

                    {gameStatus === 'WON' && (
                        <div className="endgame-modal win">
                            <h3>🎉 SECTOR CLEARED!</h3>
                            <p>Master Sweeper victory achieved!</p>
                            <div className="endgame-stats">
                                Time: {timer}s &bull; Final Score: {score.toLocaleString()}
                            </div>
                            <button className="arcade-btn-primary" onClick={() => initBoard(difficulty)}>
                                PLAY AGAIN
                            </button>
                        </div>
                    )}

                    {/* Mine Grid */}
                    <div
                        className="mine-matrix"
                        style={{
                            gridTemplateColumns: `repeat(${CONFIGS[difficulty].cols}, minmax(0, 1fr))`,
                        }}
                    >
                        {grid.map((row, r) =>
                            row.map((cell, c) => {
                                let content = '';
                                let cellClass = 'cell-hidden';

                                if (cell.isRevealed) {
                                    if (cell.isMine) {
                                        content = '💣';
                                        cellClass = cell.isBlown ? 'cell-blown' : 'cell-mine';
                                    } else if (cell.adjacentMines > 0) {
                                        content = cell.adjacentMines.toString();
                                        cellClass = `cell-revealed num-${cell.adjacentMines}`;
                                    } else {
                                        cellClass = 'cell-empty';
                                    }
                                } else if (cell.isFlagged) {
                                    content = '🚩';
                                    cellClass = 'cell-flagged';
                                }

                                return (
                                    <div
                                        key={`${r}-${c}`}
                                        className={`mine-tile ${cellClass}`}
                                        onClick={() => handleClick(r, c)}
                                        onContextMenu={(e) => handleRightClick(e, r, c)}
                                    >
                                        {content}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer Controls & Tribute Note */}
                <div className="arcade-footer">
                    <span>Left Click: <strong>Reveal Tile</strong></span>
                    <span>Right Click: <strong>Flag Mine</strong></span>
                    <span>High Score: <strong>{highScore.toLocaleString()}</strong></span>
                </div>
            </div>

            {/* Nostalgia & 20-Year Evolution Story Modal */}
            {isHistoryOpen && (
                <div className="history-modal-overlay" onClick={() => setIsHistoryOpen(false)}>
                    <div className="history-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="history-close" onClick={() => setIsHistoryOpen(false)}>
                            &times;
                        </div>
                        <h2>💣 The 20-Year Journey (2003 – 2026)</h2>

                        <div className="timeline-item">
                            <div className="timeline-year">🕹️ 2003: Cavalier Web Design & DHTML</div>
                            <p>
                                Wally's very first recreation of a video game! Built with pure vanilla JavaScript, HTML tables, and classic 16x16 GIF images during the browser wars. Written specifically for Internet Explorer 6 using <code>document.all</code> and recursive flood-fill area sweeps.
                            </p>
                        </div>

                        <div className="timeline-item">
                            <div className="timeline-year">⚡ 2006: NeoSwiff C# to Flash SWF</div>
                            <p>
                                A mid-2000s experiment utilizing the rare NeoSwiff compiler, which allowed developers to write standard C# Windows Forms applications that compiled directly into Adobe Flash <code>.swf</code> binaries! The compiled SWF is still preserved in the GitHub repo today.
                            </p>
                        </div>

                        <div className="timeline-item">
                            <div className="timeline-year">💎 2026: Neo-Mines Turbo Bling</div>
                            <p>
                                Reimagined as an easter egg for the personal website! Tricked out with Web Audio API procedural sound synthesis, first-click safety, mine deflector shields, radar sweeps, combo multipliers, and cyberpunk neon aesthetics.
                            </p>
                        </div>

                        <div className="history-actions">
                            <a
                                href="https://github.com/wallyatkins/minesweeper"
                                target="_blank"
                                rel="noreferrer"
                                className="arcade-btn-primary"
                            >
                                View GitHub Source &amp; Historic Files
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Styles for Turbo Bling Minesweeper */}
            <style>{`
                .neomines-arcade-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background: radial-gradient(circle at 50% 20%, #1e1035 0%, #080314 100%);
                    z-index: 300;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'Press Start 2P', monospace, sans-serif;
                    user-select: none;
                    overflow: auto;
                    padding: 16px;
                    color: #fff;
                }

                .crt-scanlines::after {
                    content: " ";
                    display: block;
                    position: absolute;
                    top: 0; left: 0; bottom: 0; right: 0;
                    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
                    z-index: 310;
                    background-size: 100% 4px, 6px 100%;
                    pointer-events: none;
                }

                .screen-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }

                @keyframes shake {
                    10%, 90% { transform: translate3d(-3px, 0, 0); }
                    20%, 80% { transform: translate3d(4px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
                    40%, 60% { transform: translate3d(6px, 0, 0); }
                }

                .neomines-container {
                    background: rgba(18, 11, 38, 0.95);
                    border: 3px solid #f59e0b;
                    box-shadow: 0 0 40px rgba(245, 158, 11, 0.3), inset 0 0 20px rgba(139, 92, 246, 0.2);
                    border-radius: 16px;
                    max-width: 740px;
                    width: 100%;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                    position: relative;
                    z-index: 305;
                }

                .arcade-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 2px solid rgba(245, 158, 11, 0.3);
                    padding-bottom: 12px;
                }

                .header-left, .header-right {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .header-title {
                    text-align: center;
                }
                .header-title h2 {
                    font-size: 1.3rem;
                    color: #fbbf24;
                    text-shadow: 0 0 10px rgba(251, 191, 36, 0.6);
                    margin: 0;
                    letter-spacing: 1px;
                }
                .title-sub {
                    font-size: 0.55rem;
                    color: #ec4899;
                    letter-spacing: 2px;
                }

                .arcade-btn-icon {
                    background: #2a164d;
                    border: 1px solid #7c3aed;
                    color: #e9d5ff;
                    padding: 6px 10px;
                    font-size: 0.6rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                .arcade-btn-icon:hover {
                    background: #7c3aed;
                    color: #fff;
                    box-shadow: 0 0 10px #7c3aed;
                }

                .arcade-btn-gold {
                    background: #451a03;
                    border: 1px solid #f59e0b;
                    color: #fde68a;
                    padding: 6px 10px;
                    font-size: 0.6rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-family: inherit;
                }
                .arcade-btn-gold:hover {
                    background: #f59e0b;
                    color: #000;
                }

                .arcade-close {
                    font-size: 1.8rem;
                    color: #f87171;
                    cursor: pointer;
                    line-height: 1;
                    padding: 0 4px;
                    font-family: sans-serif;
                }
                .arcade-close:hover {
                    color: #ef4444;
                    transform: scale(1.15);
                }

                /* Dashboard */
                .arcade-dashboard {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
                    gap: 8px;
                }
                .stat-card {
                    background: rgba(10, 6, 23, 0.85);
                    border: 1px solid #4c1d95;
                    border-radius: 8px;
                    padding: 8px;
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }
                .stat-label {
                    font-size: 0.5rem;
                    color: #a78bfa;
                    letter-spacing: 1px;
                }
                .stat-val {
                    font-size: 0.85rem;
                    font-weight: bold;
                }
                .neon-pink { color: #f43f5e; text-shadow: 0 0 8px rgba(244, 63, 94, 0.5); }
                .neon-cyan { color: #38bdf8; text-shadow: 0 0 8px rgba(56, 189, 248, 0.5); }
                .neon-gold { color: #fbbf24; text-shadow: 0 0 8px rgba(251, 191, 36, 0.5); }
                .neon-green { color: #34d399; text-shadow: 0 0 8px rgba(52, 211, 153, 0.5); }

                .perks-card {
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 6px;
                }
                .perk-btn {
                    font-family: inherit;
                    font-size: 0.55rem;
                    padding: 5px;
                    border-radius: 4px;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .perk-ready {
                    background: #0284c7;
                    border: 1px solid #38bdf8;
                    color: #fff;
                    box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
                }
                .perk-empty {
                    background: #1e293b;
                    border: 1px solid #475569;
                    color: #64748b;
                    cursor: not-allowed;
                }
                .perk-badge {
                    font-size: 0.5rem;
                    font-weight: bold;
                }
                .shield-on { color: #34d399; }
                .shield-off { color: #ef4444; opacity: 0.6; }

                /* Difficulty Bar */
                .difficulty-bar {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 6px;
                    justify-content: space-between;
                }
                .diff-btn {
                    flex: 1;
                    min-width: 100px;
                    background: #17112c;
                    border: 1px solid #4c1d95;
                    color: #c4b5fd;
                    padding: 8px 6px;
                    font-size: 0.55rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-family: inherit;
                    transition: all 0.2s;
                }
                .diff-btn.active {
                    background: #7c3aed;
                    color: #fff;
                    border-color: #f59e0b;
                    box-shadow: 0 0 10px rgba(124, 58, 237, 0.6);
                }
                .reset-btn {
                    background: #dc2626;
                    border: 1px solid #f87171;
                    color: #fff;
                    padding: 8px 14px;
                    font-size: 0.6rem;
                    border-radius: 6px;
                    cursor: pointer;
                    font-family: inherit;
                }
                .reset-btn:hover {
                    background: #ef4444;
                    box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
                }

                /* Grid Frame */
                .grid-outer-frame {
                    background: #080314;
                    border: 2px solid #5b21b6;
                    border-radius: 12px;
                    padding: 12px;
                    position: relative;
                    min-height: 320px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: auto;
                }

                .floating-banner {
                    position: absolute;
                    top: 20px;
                    background: rgba(245, 158, 11, 0.95);
                    color: #000;
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 0.75rem;
                    font-weight: bold;
                    z-index: 20;
                    animation: bannerPop 0.3s ease;
                    box-shadow: 0 0 20px rgba(245, 158, 11, 0.8);
                }
                @keyframes bannerPop {
                    0% { transform: scale(0.7); opacity: 0; }
                    100% { transform: scale(1); opacity: 1; }
                }

                /* End Game Modal */
                .endgame-modal {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(10, 4, 22, 0.96);
                    border-radius: 16px;
                    padding: 24px;
                    text-align: center;
                    z-index: 25;
                    box-shadow: 0 0 40px rgba(0, 0, 0, 0.9);
                    min-width: 260px;
                }
                .endgame-modal.win { border: 3px solid #10b981; }
                .endgame-modal.lose { border: 3px solid #ef4444; }
                .endgame-modal h3 {
                    font-size: 1.1rem;
                    margin-bottom: 8px;
                }
                .endgame-modal.win h3 { color: #34d399; }
                .endgame-modal.lose h3 { color: #f87171; }
                .endgame-modal p {
                    font-size: 0.6rem;
                    color: #cbd5e1;
                    margin-bottom: 12px;
                    line-height: 1.5;
                }
                .endgame-stats {
                    font-size: 0.65rem;
                    color: #facc15;
                    margin-bottom: 16px;
                }
                .arcade-btn-primary {
                    background: #2563eb;
                    border: 2px solid #60a5fa;
                    color: #fff;
                    padding: 10px 18px;
                    font-size: 0.65rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-family: inherit;
                    text-decoration: none;
                    display: inline-block;
                }
                .arcade-btn-primary:hover {
                    background: #3b82f6;
                    box-shadow: 0 0 15px rgba(59, 130, 246, 0.6);
                }

                /* Matrix of Tiles */
                .mine-matrix {
                    display: grid;
                    gap: 4px;
                    margin: 0 auto;
                }

                .mine-tile {
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.8rem;
                    font-weight: bold;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: transform 0.08s, background 0.1s;
                }

                @media (max-width: 600px) {
                    .mine-tile { width: 24px; height: 24px; font-size: 0.65rem; }
                }

                .cell-hidden {
                    background: linear-gradient(135deg, #2e1a5a 0%, #170d32 100%);
                    border: 1px solid #7c3aed;
                    box-shadow: inset 1px 1px 2px rgba(255, 255, 255, 0.2), 0 2px 4px rgba(0,0,0,0.4);
                }
                .cell-hidden:hover {
                    background: #4c1d95;
                    border-color: #f59e0b;
                    transform: scale(1.05);
                }

                .cell-revealed, .cell-empty {
                    background: #0d071a;
                    border: 1px solid #3b1772;
                    box-shadow: inset 0 0 6px rgba(0,0,0,0.8);
                }

                .cell-flagged {
                    background: #451a03;
                    border: 1px solid #f59e0b;
                    box-shadow: 0 0 8px rgba(245, 158, 11, 0.5);
                }

                .cell-mine {
                    background: #3b0764;
                    border: 1px solid #f43f5e;
                }
                .cell-blown {
                    background: #b91c1c;
                    border: 2px solid #fef08a;
                    box-shadow: 0 0 20px #ef4444;
                }

                /* Neon Number Colors */
                .num-1 { color: #38bdf8; text-shadow: 0 0 4px #0284c7; }
                .num-2 { color: #34d399; text-shadow: 0 0 4px #059669; }
                .num-3 { color: #f43f5e; text-shadow: 0 0 4px #e11d48; }
                .num-4 { color: #c084fc; text-shadow: 0 0 4px #9333ea; }
                .num-5 { color: #fbbf24; text-shadow: 0 0 4px #d97706; }
                .num-6 { color: #2dd4bf; text-shadow: 0 0 4px #0d9488; }
                .num-7 { color: #f472b6; text-shadow: 0 0 4px #db2777; }
                .num-8 { color: #e2e8f0; text-shadow: 0 0 4px #94a3b8; }

                /* Footer */
                .arcade-footer {
                    display: flex;
                    justify-content: space-between;
                    font-size: 0.55rem;
                    color: #94a3b8;
                    border-top: 1px solid rgba(255, 255, 255, 0.08);
                    padding-top: 10px;
                }

                /* History Modal */
                .history-modal-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100vw; height: 100vh;
                    background: rgba(0, 0, 0, 0.85);
                    z-index: 400;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 20px;
                }
                .history-modal-card {
                    background: #110926;
                    border: 2px solid #fbbf24;
                    border-radius: 16px;
                    padding: 28px;
                    max-width: 580px;
                    width: 100%;
                    position: relative;
                    box-shadow: 0 0 50px rgba(251, 191, 36, 0.4);
                }
                .history-close {
                    position: absolute;
                    top: 16px; right: 20px;
                    font-size: 2rem;
                    color: #fff;
                    cursor: pointer;
                    font-family: sans-serif;
                }
                .history-modal-card h2 {
                    font-size: 1.1rem;
                    color: #fbbf24;
                    margin-bottom: 20px;
                    line-height: 1.4;
                }
                .timeline-item {
                    margin-bottom: 16px;
                    border-left: 2px solid #7c3aed;
                    padding-left: 14px;
                }
                .timeline-year {
                    font-size: 0.75rem;
                    color: #38bdf8;
                    margin-bottom: 6px;
                }
                .timeline-item p {
                    font-size: 0.65rem;
                    color: #cbd5e1;
                    line-height: 1.6;
                    font-family: sans-serif;
                }
                .history-actions {
                    margin-top: 24px;
                    text-align: center;
                }
            `}</style>
        </div>
    );
};
