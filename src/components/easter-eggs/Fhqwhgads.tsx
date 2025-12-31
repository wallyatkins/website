import React, { useEffect, useRef } from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';
import { useSecretCode } from '../../hooks/useSecretCode';

// Dynamically import Ruffle to avoid bundling it with the main app
export const Fhqwhgads: React.FC = () => {
    const { isFhqwhgadsActive, activateFhqwhgads, closeFhqwhgads } = useEasterEgg();
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<any>(null);
    const isMatched = useSecretCode('fhqwhgads');

    useEffect(() => {
        if (isMatched) {
            activateFhqwhgads();
        }
    }, [isMatched, activateFhqwhgads]);

    useEffect(() => {
        if (!isFhqwhgadsActive || !containerRef.current || playerRef.current) return;

        let active = true;

        const loadRuffle = async () => {
            try {
                // Dynamic import for side effects (loading polyfills etc)
                await import('@ruffle-rs/ruffle');

                // Access via window object as per Ruffle documentation for self-hosted
                const RufflePlayer = (window as any).RufflePlayer;

                if (!RufflePlayer) {
                    throw new Error('RufflePlayer not found on window');
                }

                const ruffle = RufflePlayer.newest();
                const player = ruffle.createPlayer();

                if (active && containerRef.current) {
                    containerRef.current.innerHTML = ''; // Clear any previous
                    containerRef.current.appendChild(player);
                    player.load('/fhqwhgads.swf');
                    playerRef.current = player;
                    player.style.width = '100%';
                    player.style.height = '100%';
                }
            } catch (err) {
                console.error('Failed to load Ruffle:', err);
            }
        };

        loadRuffle();

        return () => {
            active = false;
        };
    }, [isFhqwhgadsActive]);

    // Handle Closing
    useEffect(() => {
        if (!isFhqwhgadsActive && playerRef.current) {
            // Cleanup player if needed?
            // Usually removing the DOM node is enough for Ruffle to stop.
            playerRef.current = null;
        }
    }, [isFhqwhgadsActive]);

    if (!isFhqwhgadsActive) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexDirection: 'column'
        }}>
            <button
                onClick={closeFhqwhgads}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '30px',
                    background: 'transparent',
                    border: 'none',
                    color: '#fff',
                    fontSize: '3rem',
                    cursor: 'pointer',
                    zIndex: 10000
                }}
            >
                &times;
            </button>
            <div
                ref={containerRef}
                style={{
                    width: '80%',
                    height: '80%',
                    maxWidth: '800px',
                    maxHeight: '600px'
                }}
            />
        </div>
    );
};
