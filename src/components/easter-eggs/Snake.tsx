import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';
import { DirectionalPad } from './DPad';

const GRID_SIZE = 20;
const CANVAS_SIZE = 400; // 20x20 grid

type Point = { x: number; y: number };

export const Snake: React.FC = () => {
    const { isGameUnlocked, activeGame, closeGame } = useEasterEgg();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [score, setScore] = useState(0);
    const [highScore, setHighScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    // Game State Refs (to avoid re-renders on every tick)
    const snakeRef = useRef<Point[]>([{ x: 10, y: 10 }]);
    const foodRef = useRef<Point>({ x: 15, y: 10 });
    const directionRef = useRef<Point>({ x: 0, y: 0 }); // Start stationary
    const pendingDirectionRef = useRef<Point>({ x: 0, y: 0 });
    const gameLoopRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    // Init High Score
    useEffect(() => {
        const saved = localStorage.getItem('snake-highscore');
        if (saved) setHighScore(parseInt(saved, 10));
    }, []);

    const spawnFood = useCallback(() => {
        let newFood: Point;
        while (true) {
            newFood = {
                x: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE)),
                y: Math.floor(Math.random() * (CANVAS_SIZE / GRID_SIZE))
            };
            // Check collision with snake
            const collision = snakeRef.current.some(seg => seg.x === newFood.x && seg.y === newFood.y);
            if (!collision) break;
        }
        foodRef.current = newFood;
    }, []);

    const resetGame = () => {
        snakeRef.current = [{ x: 10, y: 10 }];
        directionRef.current = { x: 0, y: 0 };
        pendingDirectionRef.current = { x: 0, y: 0 };
        setScore(0);
        setGameOver(false);
        setIsPaused(false);
        spawnFood();
        startGameLoop();
    };

    const gameOverHandler = () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        setGameOver(true);
        if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('snake-highscore', score.toString());
        }
    };

    const update = () => {
        if (gameOver || isPaused) return;

        // Apply pending direction (prevent 180 turn in single frame)
        directionRef.current = pendingDirectionRef.current;
        const dir = directionRef.current;

        if (dir.x === 0 && dir.y === 0) return; // Wait for start

        const head = { ...snakeRef.current[0] };
        head.x += dir.x;
        head.y += dir.y;

        // Wall Collision
        if (head.x < 0 || head.x >= CANVAS_SIZE / GRID_SIZE || head.y < 0 || head.y >= CANVAS_SIZE / GRID_SIZE) {
            gameOverHandler();
            return;
        }

        // Self Collision
        for (const seg of snakeRef.current) {
            if (head.x === seg.x && head.y === seg.y) {
                gameOverHandler();
                return;
            }
        }

        snakeRef.current.unshift(head);

        // Eat Food
        if (head.x === foodRef.current.x && head.y === foodRef.current.y) {
            setScore(s => s + 10);
            spawnFood();
            // Don't pop tail, so we grow
        } else {
            snakeRef.current.pop();
        }

        draw();
    };

    const draw = () => {
        const ctx = canvasRef.current?.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw Food
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';
        ctx.fillRect(foodRef.current.x * GRID_SIZE, foodRef.current.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
        ctx.shadowBlur = 0;

        // Draw Snake
        ctx.fillStyle = '#00ffcc';
        for (const seg of snakeRef.current) {
            ctx.fillRect(seg.x * GRID_SIZE, seg.y * GRID_SIZE, GRID_SIZE - 2, GRID_SIZE - 2);
        }
    };

    const startGameLoop = () => {
        if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        gameLoopRef.current = window.setInterval(() => {
            update();
            draw();
        }, 100); // Speed 100ms
    };

    useEffect(() => {
        if (isGameUnlocked && activeGame === 'SNAKE') {
            resetGame();
            // Initial Draw
            setTimeout(draw, 0);
        } else {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        }
        return () => {
            if (gameLoopRef.current) clearInterval(gameLoopRef.current);
        }
    }, [isGameUnlocked, activeGame]);

    // Handle Direction Change
    const handleDirection = (newDir: 'up' | 'down' | 'left' | 'right') => {
        const dir = directionRef.current;
        switch (newDir) {
            case 'up':
                if (dir.y === 0) pendingDirectionRef.current = { x: 0, y: -1 };
                break;
            case 'down':
                if (dir.y === 0) pendingDirectionRef.current = { x: 0, y: 1 };
                break;
            case 'left':
                if (dir.x === 0) pendingDirectionRef.current = { x: -1, y: 0 };
                break;
            case 'right':
                if (dir.x === 0) pendingDirectionRef.current = { x: 1, y: 0 };
                break;
        }
    };

    // Input Handling
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (activeGame !== 'SNAKE') return;

            switch (e.key) {
                case 'ArrowUp':
                case 'w':
                case 'W':
                    handleDirection('up');
                    break;
                case 'ArrowDown':
                case 's':
                case 'S':
                    handleDirection('down');
                    break;
                case 'ArrowLeft':
                case 'a':
                case 'A':
                    handleDirection('left');
                    break;
                case 'ArrowRight':
                case 'd':
                case 'D':
                    handleDirection('right');
                    break;
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [activeGame]);


    if (!isGameUnlocked || activeGame !== 'SNAKE') return null;

    return (
        <div id="snake-container">
            <div id="game-close-btn" onClick={closeGame}>&times;</div>

            <div className="game-header">
                <div className="score-box">SCORE: {score}</div>
                <div className="score-box">HIGH: {highScore}</div>
            </div>

            <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                id="snake-canvas"
            />
            <div className="controls-hint">Use WASD or Arrow Keys</div>

            <div className="snake-dpad-wrapper">
                <DirectionalPad onPress={handleDirection} showHint={false} className="snake-dpad" />
            </div>

            {gameOver && (
                <div id="game-over-msg" style={{ display: 'block' }}>
                    <h2>GAME OVER</h2>
                    <p>Final Score: {score}</p>
                    <button id="restart-btn" style={{ display: 'inline-block', marginTop: '1rem' }} onClick={resetGame}>Try Again</button>
                    <button id="quit-btn" style={{ display: 'inline-block', marginTop: '1rem', marginLeft: '1rem' }} onClick={closeGame} className="restart-btn">Quit</button>
                </div>
            )}

            <style>{`
                #snake-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: #0c0c0c;
                    z-index: 200;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    overflow: hidden; /* Prevent scrolling on mobile dpad use */
                }
                #snake-canvas {
                    border: 2px solid #333;
                    background: #000;
                    box-shadow: 0 0 20px rgba(0, 255, 204, 0.1);
                }
                .controls-hint {
                    color: #666;
                    font-family: monospace;
                    margin-top: 5px;
                    font-size: 0.9rem;
                }
                /* Snake DPad Overrides */
                .snake-dpad-wrapper {
                    margin-top: 10px;
                    position: relative;
                    height: 150px;
                    width: 150px;
                }
                .snake-dpad {
                    transform: scale(0.8); /* Make it slightly smaller */
                }
                /* Reuse DPad Styles but ensure relative positioning context works */
                .snake-dpad #dpad-container {
                     position: relative;
                     bottom: auto;
                     right: auto;
                }

                .restart-btn {
                     background: #333;
                    color: #fff;
                    border: 1px solid #555;
                    padding: 1rem 3rem;
                    border-radius: 50px;
                    cursor: pointer;
                    font-weight: 800;
                    font-size: 1.2rem;
                    text-transform: uppercase;
                }
            `}</style>
        </div>
    );
};
