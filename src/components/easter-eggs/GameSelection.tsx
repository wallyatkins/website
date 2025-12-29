import React from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';

export const GameSelection: React.FC = () => {
    const { isGameUnlocked, activeGame, selectGame, closeGame } = useEasterEgg();

    if (!isGameUnlocked || activeGame !== 'SELECT') return null;

    return (
        <div id="game-selection-overlay">
            <div className="game-selection-container">
                <div id="game-close-btn" onClick={closeGame}>&times;</div>
                <h2>Game Mode Unlocked</h2>
                <div className="game-options">
                    <button onClick={() => selectGame('BLOCK_BLAST')} className="game-btn">
                        Block Blast
                    </button>
                    <button onClick={() => selectGame('SNAKE')} className="game-btn">
                        Snake
                    </button>
                </div>
            </div>
            <style>{`
                #game-selection-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100vw;
                    height: 100vh;
                    background-color: rgba(0, 0, 0, 0.95);
                    z-index: 250;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    animation: fadeIn 0.5s ease;
                }
                .game-selection-container {
                    background: #111;
                    padding: 3rem;
                    border-radius: 16px;
                    border: 1px solid #333;
                    text-align: center;
                    position: relative;
                    max-width: 500px;
                    width: 90%;
                }
                .game-selection-container h2 {
                    font-size: 2.5rem;
                    margin-bottom: 2rem;
                    color: #fff;
                    font-family: 'Press Start 2P', monospace;
                    text-transform: uppercase;
                    line-height: 1.4;
                }
                .game-options {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                .game-btn {
                    padding: 1.5rem;
                    font-size: 1.25rem;
                    font-family: 'Press Start 2P', monospace;
                    background: transparent;
                    border: 2px solid #fff;
                    color: #fff;
                    cursor: pointer;
                    transition: all 0.2s;
                    text-transform: uppercase;
                }
                .game-btn:hover {
                    background: #fff;
                    color: #000;
                    transform: scale(1.05);
                }
            `}</style>
        </div>
    );
};
