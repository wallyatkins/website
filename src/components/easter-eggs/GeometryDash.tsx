import React, { useEffect, useRef, useState } from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';

const GRAVITY = 0.6;
const JUMP_FORCE = -11; // Slightly stronger jump for platforms
const BLOCK_SIZE = 30;

// Level Configuration
const LEVELS = [
    { id: 1, speed: 5, length: 1000, color: '#00f3ff' }, // Easy
    { id: 2, speed: 6, length: 1500, color: '#00ffaa' },
    { id: 3, speed: 7, length: 2000, color: '#aaff00' },
    { id: 4, speed: 8, length: 2500, color: '#ffff00' }, // Platforms start
    { id: 5, speed: 9, length: 3000, color: '#ffaa00' },
    { id: 6, speed: 10, length: 3500, color: '#ff0055' },
    { id: 7, speed: 11, length: 4000, color: '#ff00aa' },
    { id: 8, speed: 12, length: 4500, color: '#aa00ff' }, // Hard
    { id: 9, speed: 13, length: 5000, color: '#5500ff' },
    { id: 10, speed: 14, length: 6000, color: '#ffffff' } // Insane
];

export const GeometryDash: React.FC = () => {
    const { isGameUnlocked, activeGame, returnToMenu } = useEasterEgg();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameStatus, setGameStatus] = useState<'PLAYING' | 'GAME_OVER' | 'LEVEL_COMPLETE'>('PLAYING');
    const [level, setLevel] = useState(1);
    const [maxLevel, setMaxLevel] = useState(1);

    // Game State
    const player = useRef({ y: 0, dy: 0, grounded: false, rotation: 0, onPlatform: false });
    const obstacles = useRef<{ x: number, type: 'spike' | 'block' | 'platform' | 'finish', w: number, h: number, y?: number }[]>([]);
    const particles = useRef<{ x: number, y: number, vx: number, vy: number, life: number, color: string }[]>([]);

    const frameRef = useRef<number>(0);
    const lastTime = useRef<number>(0);
    const distanceRef = useRef(0);

    // Init Max Level
    useEffect(() => {
        const saved = localStorage.getItem('geodash-maxlevel');
        if (saved) setMaxLevel(parseInt(saved, 10));
    }, []);

    const resetGame = (lvl: number = level) => {
        const groundY = 400 - 50;
        player.current = { y: groundY - BLOCK_SIZE, dy: 0, grounded: true, rotation: 0, onPlatform: false };
        obstacles.current = [];
        particles.current = [];
        distanceRef.current = 0;
        setScore(0);
        setGameStatus('PLAYING');
        setLevel(lvl);
        lastTime.current = performance.now();

        // Cancel previous frame if any to prevent double loops
        cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(gameLoop);
    };

    const nextLevel = () => {
        const next = Math.min(level + 1, 10);
        setLevel(next);
        if (next > maxLevel) {
            setMaxLevel(next);
            localStorage.setItem('geodash-maxlevel', next.toString());
        }
        resetGame(next);
    };

    const spawnParticles = (x: number, y: number, color: string, count: number) => {
        for (let i = 0; i < count; i++) {
            particles.current.push({
                x, y,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color
            });
        }
    };

    const gameLoop = (time: number) => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const deltaTime = Math.min((time - lastTime.current) / 16.7, 2); // Cap delta time to prevent physics explosions on lag
        lastTime.current = time;

        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        const groundY = h - 50;
        const currentLevelConfig = LEVELS[level - 1];

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        // Draw Ground
        ctx.fillStyle = currentLevelConfig.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = currentLevelConfig.color;
        ctx.fillRect(0, groundY, w, 50);
        ctx.shadowBlur = 0;

        // --- Physics ---
        if (!player.current.grounded) {
            player.current.dy += GRAVITY * deltaTime;
            player.current.rotation += 5 * deltaTime;
        } else {
            // Snap rotation to nearest 90
            const nearest90 = Math.round(player.current.rotation / 90) * 90;
            player.current.rotation += (nearest90 - player.current.rotation) * 0.2;
            player.current.dy = 0;
        }

        let nextY = player.current.y + player.current.dy * deltaTime;
        let nextX = 100 + BLOCK_SIZE; // Right edge of player

        // Ground Collision
        if (nextY >= groundY - BLOCK_SIZE) {
            nextY = groundY - BLOCK_SIZE;
            player.current.grounded = true;
            player.current.onPlatform = false;
        }

        // --- Obstacle Spawning ---
        // Only spawn if we haven't spawned the finish line yet
        const hasFinish = obstacles.current.some(o => o.type === 'finish');

        if (!hasFinish) {
            if (distanceRef.current >= currentLevelConfig.length) {
                // Spawn Finish Line
                obstacles.current.push({
                    x: w + 500, // Give some buffer
                    type: 'finish',
                    w: 50,
                    h: 400 // Full height portal
                });
            } else if (Math.random() < (0.02 + level * 0.002) * deltaTime && obstacles.current.length < 5) { // More obstacles on higher levels
                const minGap = 200 + (14 - currentLevelConfig.speed) * 10;
                const lastObs = obstacles.current[obstacles.current.length - 1];

                if (!lastObs || (w - lastObs.x > minGap)) {
                    const r = Math.random();
                    // Platforms start at level 4
                    if (level >= 4 && r > 0.7) {
                        // Spawn Platform
                        const height = BLOCK_SIZE * 3; // Height from ground
                        obstacles.current.push({
                            x: w,
                            type: 'platform',
                            w: BLOCK_SIZE * 3, // Wide platform
                            h: BLOCK_SIZE,
                            y: groundY - height
                        });
                    } else {
                        // Spike or Block
                        obstacles.current.push({
                            x: w,
                            type: Math.random() > 0.5 ? 'spike' : 'block',
                            w: BLOCK_SIZE,
                            h: BLOCK_SIZE,
                            y: groundY // Ground obstacles sit on ground
                        });
                    }
                }
            }
        }

        // --- Collision Loop ---
        let onAnyPlatform = false;
        let crashed = false;
        let finished = false;

        // Player Bounds
        const pLeft = 100;
        const pRight = 100 + BLOCK_SIZE;
        const pTop = nextY;
        const pBottom = nextY + BLOCK_SIZE;
        const pPrevBottom = player.current.y + BLOCK_SIZE; // For checking if we came from above

        obstacles.current.forEach(obs => {
            // Update Position first
            obs.x -= currentLevelConfig.speed * deltaTime;

            // Obs Bounds
            // For spikes/blocks y is implicit groundY usually, unless platform which has explicit y
            const obsY = obs.y !== undefined ? obs.y : (groundY - obs.h);
            const obsRight = obs.x + obs.w;
            const obsLeft = obs.x;
            const obsTop = (obs.type === 'spike') ? obsY + 10 : obsY; // Spikes hit box is smaller? 
            const obsBottom = obsY + obs.h;

            // AABB Check
            if (pRight > obsLeft + 5 && pLeft < obsRight - 5 && pBottom > obsTop + 5 && pTop < obsBottom - 5) {

                if (obs.type === 'finish') {
                    finished = true;
                    return;
                }

                if (obs.type === 'spike') {
                    crashed = true;
                    return;
                }

                // Block or Platform Logic
                if (obs.type === 'block' || obs.type === 'platform') {
                    // Check if landing on top
                    // We must have been ABOVE the obstacle previously AND falling (dy >= 0)
                    // And we are somewhat within horizontal bounds
                    if (pPrevBottom <= obsTop + 10 && player.current.dy >= 0) {
                        // LANDED
                        nextY = obsTop - BLOCK_SIZE;
                        player.current.grounded = true;
                        player.current.onPlatform = true; // Mark as on platform so we don't fall immediately
                        onAnyPlatform = true;
                        player.current.dy = 0;
                    } else {
                        // HIT SIDE / BOTTOM
                        crashed = true;
                    }
                }
            }
        });

        // Remove off-screen obstacles
        obstacles.current = obstacles.current.filter(obs => obs.x > -100);

        if (crashed) {
            setGameStatus('GAME_OVER');
            spawnParticles(100, player.current.y, '#ff0055', 30);
            cancelAnimationFrame(frameRef.current);
            return;
        }

        if (finished) {
            setGameStatus('LEVEL_COMPLETE');
            spawnParticles(100, player.current.y, '#00ff00', 50);
            cancelAnimationFrame(frameRef.current);
            return;
        }

        // Apply Position
        player.current.y = nextY;

        // If we were grounded on a platform but no longer colliding with any platform (walked off edge), fall
        if (player.current.grounded && nextY < groundY - BLOCK_SIZE && !onAnyPlatform) {
            player.current.grounded = false;
        }

        // --- Drawing ---

        // Player (Cute Face)
        ctx.save();
        ctx.translate(100 + BLOCK_SIZE / 2, player.current.y + BLOCK_SIZE / 2);
        ctx.rotate((player.current.rotation * Math.PI) / 180);

        // Body
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.fillRect(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
        ctx.shadowBlur = 0;

        // Face (Eyes)
        ctx.fillStyle = '#fff';
        // Left Eye
        ctx.beginPath();
        ctx.arc(-5, -5, 3, 0, Math.PI * 2);
        ctx.fill();
        // Right Eye
        ctx.beginPath();
        ctx.arc(8, -5, 3, 0, Math.PI * 2);
        ctx.fill();

        // Mouth (Smile)
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(1.5, 2, 6, 0.2, Math.PI - 0.2);
        ctx.stroke();

        ctx.restore();

        // Obstacles
        obstacles.current.forEach(obs => {
            const y = obs.y !== undefined ? obs.y : (groundY - obs.h);

            if (obs.type === 'spike') {
                ctx.fillStyle = '#ffdd00';
                ctx.shadowColor = '#ffdd00';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(obs.x, y + obs.h);
                ctx.lineTo(obs.x + obs.w / 2, y);
                ctx.lineTo(obs.x + obs.w, y + obs.h);
                ctx.fill();
                ctx.shadowBlur = 0;
            } else if (obs.type === 'block') {
                // Ground Block
                ctx.fillStyle = '#444';
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.fillRect(obs.x, y, obs.w, obs.h);
                ctx.strokeRect(obs.x, y, obs.w, obs.h);
            } else if (obs.type === 'platform') {
                // Floating Platform
                ctx.fillStyle = '#aa00ff';
                ctx.shadowColor = '#aa00ff';
                ctx.shadowBlur = 5;
                ctx.fillRect(obs.x, y, obs.w, obs.h);
                ctx.shadowBlur = 0;
                // Shine top
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.fillRect(obs.x, y, obs.w, 4);
            } else if (obs.type === 'finish') {
                // Finish Portal
                const hue = (Date.now() / 10) % 360;
                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
                ctx.shadowBlur = 20;
                ctx.fillRect(obs.x, 0, 50, h);
            }
        });

        // Particles
        particles.current.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        if (gameStatus === 'PLAYING') {
            distanceRef.current += currentLevelConfig.speed * deltaTime;
            setScore(Math.floor(distanceRef.current));

            // Cleanup particles
            particles.current.forEach(p => {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.life -= 0.05 * deltaTime;
            });
            particles.current = particles.current.filter(p => p.life > 0);

            frameRef.current = requestAnimationFrame(gameLoop);
        }
    };

    const jump = () => {
        if (gameStatus !== 'PLAYING') return;
        if (player.current.grounded) {
            player.current.dy = JUMP_FORCE;
            player.current.grounded = false;
            // Add slight rotation kick
            player.current.rotation += 10;
        }
    };

    useEffect(() => {
        if (isGameUnlocked && activeGame === 'GEOMETRY_DASH') {
            resetGame(1);
        } else {
            cancelAnimationFrame(frameRef.current);
        }
        return () => cancelAnimationFrame(frameRef.current);
    }, [isGameUnlocked, activeGame]);

    useEffect(() => {
        const handleInput = (e: KeyboardEvent | TouchEvent | MouseEvent) => {
            if (activeGame !== 'GEOMETRY_DASH') return;
            if (e.type === 'keydown') {
                const k = (e as KeyboardEvent).key;
                if (k === ' ' || k === 'ArrowUp' || k === 'w') {
                    if (gameStatus === 'LEVEL_COMPLETE') {
                        nextLevel();
                    } else if (gameStatus === 'GAME_OVER') {
                        resetGame();
                    } else {
                        jump();
                    }
                }
            } else {
                if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                    if (gameStatus === 'LEVEL_COMPLETE') {
                        nextLevel();
                    } else if (gameStatus === 'GAME_OVER') {
                        resetGame();
                    } else {
                        jump();
                    }
                }
            }
        };

        window.addEventListener('keydown', handleInput);
        window.addEventListener('mousedown', handleInput);
        window.addEventListener('touchstart', handleInput);
        return () => {
            window.removeEventListener('keydown', handleInput);
            window.removeEventListener('mousedown', handleInput);
            window.removeEventListener('touchstart', handleInput);
        };
    }, [activeGame, gameStatus]);


    if (!isGameUnlocked || activeGame !== 'GEOMETRY_DASH') return null;

    return (
        <div className="ee-container" id="geodash-container">
            <div className="ee-close-btn" onClick={returnToMenu}>&times;</div>
            <div className="ee-header">
                <div className="ee-score-box">LEVEL {level}</div>
                <div className="ee-score-box">DIST: {Math.floor(score)}</div>
            </div>

            <canvas
                ref={canvasRef}
                width={800}
                height={400}
                id="geodash-canvas"
            />

            <div className="controls-hint" style={{ fontFamily: '"Press Start 2P", monospace', fontSize: '0.8rem', color: '#888' }}>TAP / SPACE TO JUMP</div>

            {gameStatus === 'GAME_OVER' && (
                <div className="ee-overlay" style={{ display: 'flex' }}>
                    <h2>CRASHED!</h2>
                    <p>DISTANCE: {score}m</p>
                    <button className="ee-btn" onClick={() => resetGame()}>TRY AGAIN</button>
                    <button className="ee-btn" style={{ marginTop: '1rem' }} onClick={returnToMenu}>QUIT</button>
                </div>
            )}

            {gameStatus === 'LEVEL_COMPLETE' && (
                <div className="ee-overlay" style={{ display: 'flex', borderColor: '#00ff00' }}>
                    <h2 style={{ color: '#00ff00' }}>LEVEL {level} CLEARED!</h2>
                    <p>AWESOME!</p>
                    {level < 10 ? (
                        <button className="ee-btn" onClick={nextLevel}>NEXT LEVEL</button>
                    ) : (
                        <button className="ee-btn" onClick={returnToMenu}>YOU BEAT IT ALL!</button>
                    )}
                </div>
            )}

            <style>{`
                /* Keep canvas specific styles */
                #geodash-canvas {
                    background: #111;
                    border: 4px solid #333;
                    box-shadow: 0 0 30px ${LEVELS[level - 1].color}40; /* Dynamic shadow based on level color */
                    max-width: 90vw;
                    height: auto;
                    border-radius: 4px;
                    transition: box-shadow 0.5s;
                }
            `}</style>
        </div>
    );
};
