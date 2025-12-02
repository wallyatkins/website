import React, { useState, useEffect, useRef } from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';

const GRID_SIZE = 8;
const COLORS = ['#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#E040FB', '#FF6E40'];

type Shape = number[][];

interface OptionBlock {
    id: number;
    shape: Shape;
    color: string;
    used: boolean;
}

export const BlockBlast: React.FC = () => {
    const { isGameUnlocked, closeGame } = useEasterEgg();
    const [grid, setGrid] = useState<(string | null)[][]>([]);
    const [score, setScore] = useState(0);
    const [options, setOptions] = useState<OptionBlock[]>([]);
    const [gameOver, setGameOver] = useState(false);
    const [ghost, setGhost] = useState<{ r: number, c: number, shape: Shape } | null>(null);
    const [clearingCells, setClearingCells] = useState<string[]>([]);

    const dragItem = useRef<OptionBlock | null>(null);
    const dragElement = useRef<HTMLDivElement | null>(null);
    const dragOffset = useRef({ x: 0, y: 0 });
    const validGhostPlacement = useRef<{ r: number, c: number } | null>(null);

    useEffect(() => {
        if (isGameUnlocked) {
            initGame();
        }
    }, [isGameUnlocked]);

    const initGame = () => {
        setGrid(Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null)));
        setScore(0);
        setGameOver(false);
        spawnBlocks();
    };

    const spawnBlocks = () => {
        const shapes: Shape[] = [
            [[1]], [[1, 1]], [[1, 1, 1]],
            [[1], [1]], [[1], [1], [1]],
            [[1, 1], [1, 1]],
            [[1, 1, 1], [0, 1, 0]],
            [[1, 1, 0], [0, 1, 1]],
            [[1, 0], [1, 0], [1, 1]]
        ];

        const newOptions: OptionBlock[] = [];
        for (let i = 0; i < 3; i++) {
            newOptions.push({
                id: Date.now() + i,
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                used: false
            });
        }
        setOptions(newOptions);
    };

    const canPlace = (shape: Shape, r: number, c: number, currentGrid: (string | null)[][]) => {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j]) {
                    if (r + i < 0 || r + i >= GRID_SIZE || c + j < 0 || c + j >= GRID_SIZE || currentGrid[r + i][c + j]) {
                        return false;
                    }
                }
            }
        }
        return true;
    };

    const checkGameOver = (currentOptions: OptionBlock[], currentGrid: (string | null)[][]) => {
        const available = currentOptions.filter(o => !o.used);
        if (available.length === 0) return; // Should spawn first

        let canMove = false;
        for (const opt of available) {
            for (let r = 0; r < GRID_SIZE; r++) {
                for (let c = 0; c < GRID_SIZE; c++) {
                    if (canPlace(opt.shape, r, c, currentGrid)) {
                        canMove = true;
                        break;
                    }
                }
                if (canMove) break;
            }
            if (canMove) break;
        }

        if (!canMove) setGameOver(true);
    };

    const handleDragStart = (e: React.MouseEvent | React.TouchEvent, block: OptionBlock) => {
        if (gameOver) return;
        // e.preventDefault(); // Don't prevent default here for touch scrolling unless dragging?
        // Actually we want to prevent scroll on the element

        dragItem.current = block;
        const target = e.currentTarget as HTMLDivElement;
        dragElement.current = target;

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        const rect = target.getBoundingClientRect();

        dragOffset.current = { x: clientX - rect.left, y: clientY - rect.top };

        target.classList.add('dragging');
        target.style.width = `${rect.width}px`;

        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchend', handleDragEnd);
    };

    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!dragElement.current || !dragItem.current) return;
        e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const el = dragElement.current;
        el.style.left = `${clientX - dragOffset.current.x}px`;
        el.style.top = `${clientY - dragOffset.current.y - 80}px`;

        const centerX = clientX - dragOffset.current.x + (el.offsetWidth / 2);
        const centerY = clientY - dragOffset.current.y - 80 + (el.offsetHeight / 2);

        const target = document.elementFromPoint(centerX, centerY);
        const cell = target?.closest('.grid-cell') as HTMLElement;

        if (cell) {
            const r = parseInt(cell.dataset.r || '-1');
            const c = parseInt(cell.dataset.c || '-1');
            const shape = dragItem.current.shape;

            const rOffset = Math.floor(shape.length / 2);
            const cOffset = Math.floor(shape[0].length / 2);
            const startR = r - rOffset;
            const startC = c - cOffset;

            if (canPlace(shape, startR, startC, grid)) {
                setGhost({ r: startR, c: startC, shape });
                validGhostPlacement.current = { r: startR, c: startC };
            } else {
                setGhost(null);
                validGhostPlacement.current = null;
            }
        } else {
            setGhost(null);
            validGhostPlacement.current = null;
        }
    };

    const handleDragEnd = () => {
        if (!dragElement.current || !dragItem.current) return;

        const el = dragElement.current;
        el.classList.remove('dragging');
        el.style.left = '';
        el.style.top = '';
        el.style.width = '';

        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchend', handleDragEnd);

        if (validGhostPlacement.current && dragItem.current) {
            placeBlock(validGhostPlacement.current.r, validGhostPlacement.current.c, dragItem.current.shape, dragItem.current.color);

            const updatedOptions = options.map(o => o.id === dragItem.current!.id ? { ...o, used: true } : o);
            setOptions(updatedOptions);

            if (updatedOptions.every(o => o.used)) {
                spawnBlocks();
            } else {
                // We need to check game over against the NEW grid state.
                // But placeBlock updates state async.
                // We'll rely on useEffect or pass the new grid to checkGameOver.
                // Since we can't easily get the new grid here without calculating it twice,
                // let's do it in placeBlock or useEffect.
                // useEffect on grid change is risky if it triggers on init.
                // Let's calculate new grid in placeBlock and check there?
                // But checkGameOver needs options.
                // Let's just wait for render? No, game over should be immediate.
                // We'll skip precise check here and let the next render handle it or user interaction.
                // Actually, if we spawn blocks, we check game over there.
                // If we don't spawn, we should check.
            }
        }

        setGhost(null);
        validGhostPlacement.current = null;
        dragItem.current = null;
        dragElement.current = null;
    };

    const placeBlock = (r: number, c: number, shape: Shape, color: string) => {
        const newGrid = grid.map(row => [...row]);
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j]) {
                    newGrid[r + i][c + j] = color;
                }
            }
        }

        setScore(prev => prev + 10);

        // Check lines
        let linesCleared = 0;
        const rowsToClear: number[] = [];
        const colsToClear: number[] = [];

        for (let r = 0; r < GRID_SIZE; r++) {
            if (newGrid[r].every(cell => cell !== null)) rowsToClear.push(r);
        }
        for (let c = 0; c < GRID_SIZE; c++) {
            if (newGrid.every(row => row[c] !== null)) colsToClear.push(c);
        }

        if (rowsToClear.length > 0 || colsToClear.length > 0) {
            linesCleared = rowsToClear.length + colsToClear.length;
            setScore(prev => prev + linesCleared * 100);

            const cellsToClear: string[] = [];
            rowsToClear.forEach(r => {
                for (let c = 0; c < GRID_SIZE; c++) cellsToClear.push(`${r},${c}`);
                newGrid[r].fill(null);
            });
            colsToClear.forEach(c => {
                for (let r = 0; r < GRID_SIZE; r++) cellsToClear.push(`${r},${c}`);
                for (let r = 0; r < GRID_SIZE; r++) newGrid[r][c] = null;
            });

            setClearingCells(cellsToClear);
            setTimeout(() => setClearingCells([]), 300);
        }

        setGrid(newGrid);

        // Check Game Over with new grid and CURRENT options (minus the one just used)
        // We updated options state, but here we need the derived state.
        // It's tricky to sync. Let's use a useEffect on grid/options change to check game over?
        // Yes.
    };

    useEffect(() => {
        if (!gameOver && options.length > 0) {
            checkGameOver(options, grid);
        }
    }, [grid, options]);

    if (!isGameUnlocked) return null;

    return (
        <div id="game-container">
            <div id="game-close-btn" onClick={closeGame}>&times;</div>
            <div className="game-header">
                <h3>Block Blast</h3>
                <div className="score-box">Score: <span id="score">{score}</span></div>
            </div>

            <div id="game-grid">
                {grid.map((row, r) => row.map((color, c) => {
                    const isGhost = ghost && ghost.shape[r - ghost.r] && ghost.shape[r - ghost.r][c - ghost.c];
                    const isClearing = clearingCells.includes(`${r},${c}`);
                    return (
                        <div
                            key={`${r}-${c}`}
                            className={`grid-cell ${color ? 'filled' : ''} ${isGhost ? 'ghost' : ''} ${isClearing ? 'clearing' : ''}`}
                            style={{ backgroundColor: color || (isGhost ? 'rgba(255,255,255,0.2)' : '') }}
                            data-r={r}
                            data-c={c}
                        ></div>
                    );
                }))}
            </div>

            <div id="block-options">
                {options.map(opt => !opt.used && (
                    <div
                        key={opt.id}
                        className="option-block"
                        style={{ gridTemplateColumns: `repeat(${opt.shape[0].length}, 1fr)` }}
                        onMouseDown={(e) => handleDragStart(e, opt)}
                        onTouchStart={(e) => handleDragStart(e, opt)}
                    >
                        {opt.shape.map((row, i) => row.map((cell, j) => (
                            <div
                                key={`${i}-${j}`}
                                className="block-cell"
                                style={{ backgroundColor: cell ? opt.color : 'transparent', boxShadow: cell ? '' : 'none' }}
                            ></div>
                        )))}
                    </div>
                ))}
            </div>

            {gameOver && (
                <div id="game-over-msg" style={{ display: 'block' }}>
                    <h2>Game Over</h2>
                    <button id="restart-btn" style={{ display: 'block' }} onClick={initGame}>Play Again</button>
                </div>
            )}
        </div>
    );
};
