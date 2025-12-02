import React, { useEffect, useState } from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';

export const Zoltar: React.FC = () => {
    const { isZoltarActive, closeZoltar } = useEasterEgg();
    const [gameState, setGameState] = useState<'AIMING' | 'READY' | 'FIRING' | 'END'>('AIMING');
    const [rampAngle, setRampAngle] = useState(0);
    const [showCoin, setShowCoin] = useState(false);
    const [ticketDispensed, setTicketDispensed] = useState(false);
    const [coinStyle, setCoinStyle] = useState<React.CSSProperties>({});
    const [mouthOpen, setMouthOpen] = useState(false);

    useEffect(() => {
        if (!isZoltarActive) return;

        // Reset state
        setGameState('AIMING');
        setRampAngle(0);
        setShowCoin(false);
        setTicketDispensed(false);
        setMouthOpen(false);
        setCoinStyle({});

        // Timer to READY
        const timer = setTimeout(() => {
            setGameState('READY');
        }, 5000);

        return () => clearTimeout(timer);
    }, [isZoltarActive]);

    const handleMouseMove = (e: MouseEvent) => {
        if (gameState !== 'AIMING' && gameState !== 'READY') return;
        const centerX = window.innerWidth / 2;
        const delta = e.clientX - centerX;
        const angle = Math.max(-30, Math.min(30, delta / 10));
        setRampAngle(angle);
    };

    useEffect(() => {
        if (isZoltarActive) {
            window.addEventListener('mousemove', handleMouseMove);
        }
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isZoltarActive, gameState]);

    const fireCoin = () => {
        if (gameState !== 'READY') return;
        setGameState('FIRING');
        setShowCoin(true);

        const isWin = Math.abs(rampAngle) < 5;

        // Animate Coin
        // Initial position
        setCoinStyle({
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            transition: 'none'
        });

        // Trigger animation frame
        setTimeout(() => {
            setCoinStyle({
                bottom: '260px',
                transform: `translateX(calc(-50% + ${rampAngle * 3}px))`,
                transition: 'all 1s ease-out'
            });
        }, 50);

        setTimeout(() => {
            if (isWin) {
                setMouthOpen(true);
                setCoinStyle(prev => ({ ...prev, opacity: 0 })); // Swallowed
                setTimeout(() => setTicketDispensed(true), 500);
            } else {
                // Bounce off
                setCoinStyle(prev => ({
                    ...prev,
                    bottom: '20px',
                    transform: `translateX(calc(-50% + ${rampAngle * 5}px)) rotate(720deg)`
                }));
                setTimeout(() => {
                    setGameState('READY'); // Reset for retry
                    setShowCoin(false);
                }, 1000);
            }
        }, 1000);
    };

    if (!isZoltarActive) return null;

    return (
        <div id="zoltar-overlay" style={{ display: 'flex' }}>
            <div className="zoltar-booth">
                <div className="booth-header">
                    <div className="sign-box left">
                        <div className={`sign-text ${gameState === 'AIMING' ? 'flashing' : ''}`}>AIM RAMP<br />AT ZOLTAR</div>
                    </div>
                    <div className="sign-box right">
                        <div className={`sign-text ${gameState === 'READY' ? 'flashing' : ''}`}>PRESS RED<br />BUTTON</div>
                    </div>
                </div>

                <div className="zoltar-window">
                    <svg className="zoltar-svg" viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg">
                        <rect width="300" height="400" fill="#1a0b0b" />
                        <path d="M0 0 Q50 100 0 300" fill="#4a0e0e" />
                        <path d="M300 0 Q250 100 300 300" fill="#4a0e0e" />

                        <g id="zoltar-torso">
                            <path d="M70 400 L230 400 L210 250 L90 250 Z" fill="#8e44ad" />
                            <path d="M90 250 L210 250 L150 300 Z" fill="#f1c40f" />
                        </g>

                        <g id="zoltar-head-group" style={{ animation: 'headBob 3s infinite ease-in-out', transformOrigin: 'center bottom' }}>
                            <path d="M80 140 Q150 80 220 140 L220 180 L80 180 Z" fill="#3498db" />
                            <circle cx="150" cy="130" r="15" fill="#f1c40f" stroke="#e67e22" strokeWidth="2" />
                            <path d="M150 130 L150 100" stroke="#f1c40f" strokeWidth="2" />
                            <ellipse cx="150" cy="90" rx="10" ry="20" fill="#ecf0f1" />

                            <path d="M100 180 L200 180 L190 280 Q150 310 110 280 Z" fill="#e6c2a0" />

                            <path d="M120 250 Q150 240 180 250" stroke="#2c3e50" strokeWidth="3" fill="none" />
                            <path d="M140 280 L150 300 L160 280 Z" fill="#2c3e50" />

                            <g id="zoltar-eyes">
                                <circle cx="130" cy="210" r="6" fill="#fff" />
                                <circle cx="170" cy="210" r="6" fill="#fff" />
                                <circle cx="130" cy="210" r="2" fill="#000" className={gameState === 'READY' ? 'glowing-red' : ''} />
                                <circle cx="170" cy="210" r="2" fill="#000" className={gameState === 'READY' ? 'glowing-red' : ''} />
                            </g>

                            <g id="zoltar-mouth-group">
                                {mouthOpen ? (
                                    <ellipse cx="150" cy="265" rx="15" ry="10" fill="#000" />
                                ) : (
                                    <rect x="135" y="260" width="30" height="10" rx="5" fill="#3e2723" />
                                )}
                            </g>
                        </g>

                        <ellipse cx="60" cy="350" rx="20" ry="15" fill="#e6c2a0" transform="rotate(-20 60 350)" />
                        <ellipse cx="240" cy="350" rx="20" ry="15" fill="#e6c2a0" transform="rotate(20 240 350)" />

                        <circle cx="150" cy="380" r="40" fill="url(#crystal-grad)" opacity="0.8" />
                        <defs>
                            <radialGradient id="crystal-grad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
                                <stop offset="0%" style={{ stopColor: 'rgba(255,255,255,0.8)' }} />
                                <stop offset="100%" style={{ stopColor: 'rgba(100,200,255,0.2)' }} />
                            </radialGradient>
                        </defs>
                    </svg>

                    <div id="ramp-container" style={{ transform: `translateX(-50%) rotate(${rampAngle}deg)` }}>
                        <div id="coin-ramp"></div>
                    </div>
                    {showCoin && <div id="game-coin" style={coinStyle}></div>}
                </div>

                <div className="booth-controls">
                    <button
                        id="zoltar-button"
                        className={gameState === 'READY' ? 'active' : ''}
                        disabled={gameState !== 'READY'}
                        onClick={fireCoin}
                    >
                        RELEASE COIN
                    </button>
                    <div className="ticket-slot">
                        <div id="ticket" className={ticketDispensed ? 'dispensed' : ''}>WISH GRANTED</div>
                    </div>
                </div>

                <button
                    onClick={closeZoltar}
                    style={{
                        position: 'absolute',
                        top: -40,
                        right: 0,
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        fontSize: '2rem',
                        cursor: 'pointer'
                    }}
                >
                    &times;
                </button>
            </div>
        </div>
    );
};
