import React, { useEffect, useRef, useState } from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';
import { level1 } from './levels/level1';
import { level2 } from './levels/level2';
import type { LevelData, LevelObstacle } from './levels/types';

const GRAVITY = 0.6;
const JUMP_FORCE = -11; // Slightly stronger jump for platforms
const BLOCK_SIZE = 30;

// Level Configuration
const LEVELS: LevelData[] = [
    level1,
    level2,
    // Fallback for higher levels if needed, or just loop/cap
    { ...level1, id: 3, speed: 9, color: '#aaff00' }, 
    { ...level2, id: 4, speed: 10, color: '#ffff00' },
    { ...level1, id: 5, speed: 11, color: '#ffaa00' },
    { ...level2, id: 6, speed: 12, color: '#ff0055' },
    { ...level1, id: 7, speed: 13, color: '#ff00aa' },
    { ...level2, id: 8, speed: 14, color: '#aa00ff' },
    { ...level1, id: 9, speed: 15, color: '#5500ff' },
    { ...level2, id: 10, speed: 16, color: '#ffffff' }
];

export const GeometryDash: React.FC = () => {
    const { isGameUnlocked, activeGame, returnToMenu } = useEasterEgg();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameStatus, setGameStatus] = useState<'PLAYING' | 'GAME_OVER' | 'LEVEL_COMPLETE'>('PLAYING');
    const gameStatusRef = useRef<'PLAYING' | 'GAME_OVER' | 'LEVEL_COMPLETE'>('PLAYING');
    const [level, setLevel] = useState(1);
    const [maxLevel, setMaxLevel] = useState(1);
    const [attempts, setAttempts] = useState(1);
    const pulseRef = useRef(0);
    const shakeRef = useRef(0);

    // Game State
    const player = useRef({ 
        y: 0, 
        dy: 0, 
        grounded: false, 
        rotation: 0, 
        onPlatform: false,
        trail: [] as { x: number, y: number }[],
        mode: 'CUBE' as 'CUBE' | 'SHIP'
    });
    // Use the type from types.ts, adapted for internal state if needed
    const obstacles = useRef<LevelObstacle[]>([]); 
    const particles = useRef<{ x: number, y: number, vx: number, vy: number, life: number, color: string }[]>([]);
    const backgroundElements = useRef<{ x: number, y: number, size: number, speed: number }[]>([]);

    const frameRef = useRef<number>(0);
    const lastTime = useRef<number>(0);
    const distanceRef = useRef(0);
    const isJumpPressed = useRef(false);

    // Init Max Level
    useEffect(() => {
        const saved = localStorage.getItem('geodash-maxlevel');
        if (saved) setMaxLevel(parseInt(saved, 10));

        // Init background stars/elements
        backgroundElements.current = Array.from({ length: 20 }, () => ({
            x: Math.random() * 800,
            y: Math.random() * 300,
            size: 2 + Math.random() * 4,
            speed: 0.5 + Math.random() * 1
        }));
    }, []);

    const resetGame = (lvl: number = level) => {
        const groundY = 400 - 50;
        setAttempts(prev => lvl === level ? prev + 1 : 1);
        pulseRef.current = 0;
        player.current = { 
            y: groundY - BLOCK_SIZE, 
            dy: 0, 
            grounded: true, 
            rotation: 0, 
            onPlatform: false,
            trail: [],
            mode: 'CUBE'
        };
        
        // Load Level Obstacles (Deep Copy)
        const currentLevelConfig = LEVELS[lvl - 1] || LEVELS[0];
        obstacles.current = currentLevelConfig.obstacles.map(o => ({ ...o }));
        
        // Add Finish Line
        obstacles.current.push({
            x: currentLevelConfig.length,
            type: 'finish',
            w: 50,
            h: 400,
            y: 0
        });

        particles.current = [];
        distanceRef.current = 0;
        setScore(0);
        setGameStatus('PLAYING');
        gameStatusRef.current = 'PLAYING';
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
        const isPlaying = gameStatusRef.current === 'PLAYING';
        pulseRef.current = (pulseRef.current + 0.05 * deltaTime) % (Math.PI * 2);
        const pulse = Math.sin(pulseRef.current) * 0.5 + 0.5;

        // --- Shake ---
        ctx.save();
        if (shakeRef.current > 0) {
            const sx = (Math.random() - 0.5) * shakeRef.current;
            const sy = (Math.random() - 0.5) * shakeRef.current;
            ctx.translate(sx, sy);
            shakeRef.current -= deltaTime;
        }

        // --- Background & Grid ---
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        // Pulsing background color tint
        ctx.fillStyle = `${currentLevelConfig.color}${Math.floor(pulse * 20).toString(16).padStart(2, '0')}`;
        ctx.fillRect(0, 0, w, h);

        // Draw Parallax Stars
        backgroundElements.current.forEach(el => {
            el.x -= el.speed * deltaTime;
            if (el.x < -10) el.x = w + 10;
            ctx.fillStyle = `${currentLevelConfig.color}44`;
            ctx.fillRect(el.x, el.y, el.size, el.size);
        });

        // Draw Grid
        const gridOffset = (distanceRef.current * 0.5) % 100;
        ctx.strokeStyle = `${currentLevelConfig.color}22`;
        ctx.lineWidth = 1;
        for (let x = -gridOffset; x < w; x += 100) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, groundY);
            ctx.stroke();
        }
        for (let y = 0; y < groundY; y += 100) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        // Draw Ground
        ctx.fillStyle = currentLevelConfig.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = currentLevelConfig.color;
        ctx.fillRect(0, groundY, w, 50);
        ctx.shadowBlur = 0;

        // Ground secondary layer
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, groundY + 5, w, 45);

        // --- Physics ---
        if (player.current.mode === 'CUBE') {
            if (isJumpPressed.current && player.current.grounded) {
                jump();
            }
            if (!player.current.grounded) {
                player.current.dy += GRAVITY * deltaTime;
                player.current.rotation += 6 * deltaTime;
            } else {
                const nearest90 = Math.round(player.current.rotation / 90) * 90;
                player.current.rotation += (nearest90 - player.current.rotation) * 0.3;
                player.current.dy = 0;
            }
        } else if (player.current.mode === 'SHIP') {
            player.current.grounded = false; // Never grounded in ship mode unless hitting floor/ceiling
            const thrust = isJumpPressed.current ? -0.8 : 0.4;
            player.current.dy += thrust * deltaTime;
            // Cap speed
            player.current.dy = Math.max(Math.min(player.current.dy, 8), -8);
            // Rotate based on velocity
            player.current.rotation = player.current.dy * 5;
        }

        let nextY = player.current.y + player.current.dy * deltaTime;

        // Ground/Ceiling Collision
        if (nextY >= groundY - BLOCK_SIZE) {
            nextY = groundY - BLOCK_SIZE;
            player.current.grounded = true;
            player.current.onPlatform = false;
            if (player.current.mode === 'SHIP') player.current.dy = 0;
        }
        if (nextY <= 0) {
            nextY = 0;
            player.current.dy = 0;
            if (player.current.mode === 'SHIP') {
                // In ship mode hitting ceiling is death usually, but let's be lenient or check for blocks
            }
        }

        // Update Trail
        if (isPlaying) {
            player.current.trail.push({ x: 100 + BLOCK_SIZE / 2, y: player.current.y + BLOCK_SIZE / 2 });
            if (player.current.trail.length > 20) player.current.trail.shift();
        }

        // --- Obstacle Spawning ---
        // (Removed: obstacles are now pre-loaded from level files)

        // --- Collision Loop ---
        let onAnyPlatform = false;
        let crashed = false;
        let finished = false;

        const pLeft = 100;
        const pRight = 100 + BLOCK_SIZE;
        const pTop = nextY;
        const pBottom = nextY + BLOCK_SIZE;
        const pPrevBottom = player.current.y + BLOCK_SIZE;

        obstacles.current.forEach(obs => {
            if (isPlaying) {
                obs.x -= currentLevelConfig.speed * deltaTime;
            }

            const obsY = obs.y !== undefined ? obs.y : (groundY - obs.h);
            const obsRight = obs.x + obs.w;
            const obsLeft = obs.x;
            const obsTop = (obs.type === 'spike') ? obsY + 8 : obsY;
            const obsBottom = obsY + obs.h;

            if (isPlaying && pRight > obsLeft + 5 && pLeft < obsRight - 5 && pBottom > obsTop + 5 && pTop < obsBottom - 5) {

                if (obs.type === 'finish') {
                    finished = true;
                    return;
                }

                if (obs.type === 'portal') {
                    player.current.mode = obs.portalType!;
                    return;
                }

                if (obs.type === 'spike') {
                    crashed = true;
                    return;
                }

                if (obs.type === 'block' || obs.type === 'platform') {
                    if (pPrevBottom <= obsTop + 15 && player.current.dy >= 0) {
                        nextY = obsTop - BLOCK_SIZE;
                        player.current.grounded = true;
                        player.current.onPlatform = true;
                        onAnyPlatform = true;
                        player.current.dy = 0;
                    } else {
                        crashed = true;
                    }
                }
            }
        });

        // Remove off-screen obstacles
        obstacles.current = obstacles.current.filter(obs => obs.x > -100);

        if (crashed) {
            setGameStatus('GAME_OVER');
            gameStatusRef.current = 'GAME_OVER';
            shakeRef.current = 20;
            spawnParticles(100, player.current.y, '#ff0055', 30);
            cancelAnimationFrame(frameRef.current);
            // Still need to draw one last frame with shake or handle it in a way it shows
            frameRef.current = requestAnimationFrame(gameLoop);
            return;
        }

        if (finished) {
            setGameStatus('LEVEL_COMPLETE');
            gameStatusRef.current = 'LEVEL_COMPLETE';
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

        // Progress Bar
        const progress = Math.min(distanceRef.current / currentLevelConfig.length, 1);
        ctx.fillStyle = '#222';
        ctx.fillRect(w / 4, 20, w / 2, 10);
        ctx.fillStyle = currentLevelConfig.color;
        ctx.shadowColor = currentLevelConfig.color;
        ctx.shadowBlur = 10;
        ctx.fillRect(w / 4, 20, (w / 2) * progress, 10);
        ctx.shadowBlur = 0;

        // Trail
        if (player.current.trail.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = `${currentLevelConfig.color}88`;
            ctx.shadowColor = currentLevelConfig.color;
            ctx.shadowBlur = 10;
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.moveTo(player.current.trail[0].x, player.current.trail[0].y);
            for (let i = 1; i < player.current.trail.length; i++) {
                // Adjust trail x based on speed to make it look like it's staying in place
                const trailX = player.current.trail[i].x - (player.current.trail.length - i) * currentLevelConfig.speed * 0.2;
                ctx.lineTo(trailX, player.current.trail[i].y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // Player (Cute Face)
        ctx.save();
        ctx.translate(100 + BLOCK_SIZE / 2, player.current.y + BLOCK_SIZE / 2);
        ctx.rotate((player.current.rotation * Math.PI) / 180);

        if (player.current.mode === 'CUBE') {
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
        } else {
            // Ship Vehicle
            ctx.fillStyle = '#ff0055';
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 10;
            
            // Main hull
            ctx.beginPath();
            ctx.moveTo(-15, 0);
            ctx.lineTo(15, -5);
            ctx.lineTo(15, 5);
            ctx.closePath();
            ctx.fill();
            
            // Wings
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-20, -15);
            ctx.lineTo(0, -5);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(-10, 0);
            ctx.lineTo(-20, 15);
            ctx.lineTo(0, 5);
            ctx.fill();
            
            // Cockpit
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(5, 0, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Flame
            if (isJumpPressed.current) {
                ctx.fillStyle = '#ffaa00';
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.lineTo(-25 - Math.random() * 10, 0);
                ctx.lineTo(-15, 5);
                ctx.fill();
            }
            
            ctx.shadowBlur = 0;
        }

        ctx.restore();

        // Obstacles
        obstacles.current.forEach(obs => {
            const y = obs.y !== undefined ? obs.y : (groundY - obs.h);

            if (obs.type === 'spike') {
                const gradient = ctx.createLinearGradient(obs.x, y, obs.x, y + obs.h);
                gradient.addColorStop(0, '#fff');
                gradient.addColorStop(1, '#ffdd00');
                ctx.fillStyle = gradient;
                ctx.shadowColor = '#ffdd00';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(obs.x + 5, y + obs.h);
                ctx.lineTo(obs.x + obs.w / 2, y + 5);
                ctx.lineTo(obs.x + obs.w - 5, y + obs.h);
                ctx.closePath();
                ctx.fill();
                ctx.shadowBlur = 0;
                
                // Spike detail
                ctx.strokeStyle = 'rgba(0,0,0,0.3)';
                ctx.lineWidth = 1;
                ctx.stroke();
            } else if (obs.type === 'block') {
                // Ground Block
                ctx.fillStyle = '#333';
                ctx.fillRect(obs.x, y, obs.w, obs.h);
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 2;
                ctx.strokeRect(obs.x + 2, y + 2, obs.w - 4, obs.h - 4);
                
                // Inner glow
                ctx.fillStyle = 'rgba(255,255,255,0.1)';
                ctx.fillRect(obs.x + 5, y + 5, obs.w - 10, obs.h - 10);
            } else if (obs.type === 'platform') {
                // Floating Platform
                const gradient = ctx.createLinearGradient(obs.x, y, obs.x, y + obs.h);
                gradient.addColorStop(0, '#aa00ff');
                gradient.addColorStop(1, '#440088');
                ctx.fillStyle = gradient;
                ctx.fillRect(obs.x, y, obs.w, obs.h);
                
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1;
                ctx.strokeRect(obs.x, y, obs.w, obs.h);
                
                // Shine top
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.fillRect(obs.x, y, obs.w, 4);
            } else if (obs.type === 'portal') {
                // Portal
                const color = obs.portalType === 'SHIP' ? '#00ff00' : '#00aaff';
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                ctx.strokeStyle = color;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.ellipse(obs.x + obs.w / 2, y + obs.h / 2, obs.w / 2, obs.h / 2, 0, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner lines
                ctx.lineWidth = 2;
                for (let i = 0; i < 3; i++) {
                    const offset = (Date.now() / 100 + i * 2) % 10;
                    ctx.beginPath();
                    ctx.ellipse(obs.x + obs.w / 2, y + obs.h / 2, (obs.w / 2) - offset, (obs.h / 2) - offset, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
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

        // Attempt Text
        if (distanceRef.current < 200) {
            ctx.fillStyle = '#fff';
            ctx.font = '24px "Press Start 2P"';
            ctx.textAlign = 'center';
            ctx.globalAlpha = Math.max(0, 1 - distanceRef.current / 200);
            ctx.fillText(`ATTEMPT ${attempts}`, w / 2, h / 2);
            ctx.globalAlpha = 1;
        }

        if (gameStatusRef.current === 'PLAYING' || shakeRef.current > 0) {
            if (gameStatusRef.current === 'PLAYING') {
                distanceRef.current += currentLevelConfig.speed * deltaTime;
                setScore(Math.floor(distanceRef.current));
            }

            // Cleanup particles
            particles.current.forEach(p => {
                p.x += p.vx * deltaTime;
                p.y += p.vy * deltaTime;
                p.life -= 0.05 * deltaTime;
            });
            particles.current = particles.current.filter(p => p.life > 0);

            frameRef.current = requestAnimationFrame(gameLoop);
        }

        ctx.restore();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isGameUnlocked, activeGame]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeGame !== 'GEOMETRY_DASH') return;
            const k = e.key;
            if (k === ' ' || k === 'ArrowUp' || k === 'w') {
                isJumpPressed.current = true;
                if (gameStatus === 'LEVEL_COMPLETE') {
                    nextLevel();
                } else if (gameStatus === 'GAME_OVER') {
                    resetGame();
                } else {
                    jump();
                }
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (activeGame !== 'GEOMETRY_DASH') return;
            const k = e.key;
            if (k === ' ' || k === 'ArrowUp' || k === 'w') {
                isJumpPressed.current = false;
            }
        };

        const handleMouseDown = (e: MouseEvent | TouchEvent) => {
            if (activeGame !== 'GEOMETRY_DASH') return;
            if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                isJumpPressed.current = true;
                if (gameStatus === 'LEVEL_COMPLETE') {
                    nextLevel();
                } else if (gameStatus === 'GAME_OVER') {
                    resetGame();
                } else {
                    jump();
                }
            }
        };

        const handleMouseUp = () => {
            isJumpPressed.current = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchstart', handleMouseDown);
        window.addEventListener('touchend', handleMouseUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchstart', handleMouseDown);
            window.removeEventListener('touchend', handleMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
