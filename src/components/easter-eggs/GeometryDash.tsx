import React, { useEffect, useRef, useState } from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';

const GRAVITY = 0.6;
const JUMP_FORCE = -10;
const SPEED = 5;
const BLOCK_SIZE = 30;

export const GeometryDash: React.FC = () => {
    const { isGameUnlocked, activeGame, returnToMenu } = useEasterEgg();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [highScore, setHighScore] = useState(0);

    // Game State
    const player = useRef({ y: 0, dy: 0, grounded: false, rotation: 0 });
    const obstacles = useRef<{ x: number, type: 'spike' | 'block', w: number, h: number }[]>([]);
    const particles = useRef<{ x: number, y: number, vx: number, vy: number, life: number, color: string }[]>([]);
    const frameRef = useRef<number>(0);
    const lastTime = useRef<number>(0);

    useEffect(() => {
        const saved = localStorage.getItem('geodash-highscore');
        if (saved) setHighScore(parseInt(saved, 10));
    }, []);

    const resetGame = () => {
        player.current = { y: 0, dy: 0, grounded: true, rotation: 0 };
        obstacles.current = [];
        particles.current = [];
        setScore(0);
        setGameOver(false);
        lastTime.current = performance.now();
        frameRef.current = requestAnimationFrame(gameLoop);
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

        const deltaTime = (time - lastTime.current) / 16.7; // Normalize to ~60fps
        lastTime.current = time;

        const w = canvasRef.current.width;
        const h = canvasRef.current.height;
        const groundY = h - 50;

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, w, h);

        // Draw Ground
        ctx.fillStyle = '#00f3ff';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#00f3ff';
        ctx.fillRect(0, groundY, w, 50);
        ctx.shadowBlur = 0;

        // --- Physics ---
        if (!player.current.grounded) {
            player.current.dy += GRAVITY * deltaTime;
            player.current.rotation += 5 * deltaTime;
        } else {
            // Snap rotation
            const nearest90 = Math.round(player.current.rotation / 90) * 90;
            player.current.rotation += (nearest90 - player.current.rotation) * 0.2;
        }

        player.current.y += player.current.dy * deltaTime;

        // Ground Collision
        if (player.current.y >= groundY - BLOCK_SIZE) {
            player.current.y = groundY - BLOCK_SIZE;
            player.current.dy = 0;
            player.current.grounded = true;
        }

        // --- Obstacles ---
        if (Math.random() < 0.02 * deltaTime && obstacles.current.length < 5) {
            const minGap = 200;
            const lastObs = obstacles.current[obstacles.current.length - 1];
            if (!lastObs || (w - lastObs.x > minGap)) {
                obstacles.current.push({
                    x: w,
                    type: Math.random() > 0.5 ? 'spike' : 'block',
                    w: BLOCK_SIZE,
                    h: BLOCK_SIZE
                });
            }
        }

        obstacles.current.forEach(obs => obs.x -= SPEED * deltaTime);
        obstacles.current = obstacles.current.filter(obs => obs.x > -50);

        // --- Particles ---
        particles.current.forEach(p => {
            p.x += p.vx * deltaTime;
            p.y += p.vy * deltaTime;
            p.life -= 0.05 * deltaTime;
        });
        particles.current = particles.current.filter(p => p.life > 0);

        // --- Rendering ---

        // Draw Player
        ctx.save();
        ctx.translate(100 + BLOCK_SIZE / 2, player.current.y + BLOCK_SIZE / 2);
        ctx.rotate((player.current.rotation * Math.PI) / 180);
        ctx.fillStyle = '#ff0055';
        ctx.shadowColor = '#ff0055';
        ctx.shadowBlur = 15;
        ctx.fillRect(-BLOCK_SIZE / 2, -BLOCK_SIZE / 2, BLOCK_SIZE, BLOCK_SIZE);
        ctx.restore();

        // Draw Obstacles
        obstacles.current.forEach(obs => {
            if (obs.type === 'spike') {
                ctx.fillStyle = '#ffdd00';
                ctx.shadowColor = '#ffdd00';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(obs.x, groundY);
                ctx.lineTo(obs.x + obs.w / 2, groundY - obs.h);
                ctx.lineTo(obs.x + obs.w, groundY);
                ctx.fill();
            } else {
                ctx.fillStyle = '#ffdd00';
                ctx.fillRect(obs.x, groundY - obs.h, obs.w, obs.h);
            }

            // Simple Collision
            const pX = 100;
            const pY = player.current.y;
            // Player Box (slightly smaller for forgiveness)
            const margin = 5;

            // Obs Box
            const oX = obs.x;
            const oY = groundY - obs.h;

            if (
                pX + BLOCK_SIZE - margin > oX &&
                pX + margin < oX + obs.w &&
                pY + BLOCK_SIZE - margin > oY
            ) {
                setGameOver(true);
                setScore(s => {
                    if (s > highScore) {
                        setHighScore(s);
                        localStorage.setItem('geodash-highscore', s.toString());
                    }
                    return s;
                });
                spawnParticles(100, player.current.y, '#ff0055', 20);
                cancelAnimationFrame(frameRef.current);
                return; // Stop loop
            }
        });

        // Draw Particles
        particles.current.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, 4, 4);
        });
        ctx.globalAlpha = 1;

        if (!gameOver) {
            setScore(s => s + 1);
            frameRef.current = requestAnimationFrame(gameLoop);
        }
    };

    const jump = () => {
        if (gameOver) return;
        if (player.current.grounded) {
            player.current.dy = JUMP_FORCE;
            player.current.grounded = false;
        }
    };

    useEffect(() => {
        if (isGameUnlocked && activeGame === 'GEOMETRY_DASH') {
            resetGame();
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
                    jump();
                }
            } else {
                // Touch/Mouse
                // jump(); // Actually, let's keep it specific to avoid overlay issues? 
                // Nah, click anywhere to jump is standard for runner.
                // But ensure we aren't clicking a button.
                if ((e.target as HTMLElement).tagName !== 'BUTTON') {
                    jump();
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
    }, [activeGame, gameOver]);


    if (!isGameUnlocked || activeGame !== 'GEOMETRY_DASH') return null;

    return (
        <div id="geodash-container">
            <div id="game-close-btn" onClick={returnToMenu}>&times;</div>
            <div className="game-header">
                <div className="score-box">DISTANCE: {Math.floor(score / 10)}m</div>
                <div className="score-box">BEST: {Math.floor(highScore / 10)}m</div>
            </div>

            <canvas
                ref={canvasRef}
                width={800}
                height={400}
                id="geodash-canvas"
            />

            <div className="controls-hint">Tap / Click / Space to Jump</div>

            {gameOver && (
                <div id="game-over-msg" style={{ display: 'block' }}>
                    <h2>CRASHED!</h2>
                    <p>Distance: {Math.floor(score / 10)}m</p>
                    <button id="restart-btn" style={{ display: 'inline-block', marginTop: '1rem' }} onClick={resetGame}>Try Again</button>
                    <button id="quit-btn" style={{ display: 'inline-block', marginTop: '1rem', marginLeft: '1rem' }} onClick={returnToMenu} className="restart-btn">Quit</button>
                </div>
            )}

            <style>{`
                #geodash-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: #050505;
                    z-index: 200;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                }
                #geodash-canvas {
                    background: #111;
                    border: 2px solid #333;
                    box-shadow: 0 0 30px rgba(0, 243, 255, 0.2);
                    max-width: 90vw;
                    height: auto;
                }
            `}</style>
        </div>
    );
};
