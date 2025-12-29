import React, { useRef } from 'react';
import { useEasterEgg } from '../context/EasterEggContext';
import { DPad } from './easter-eggs/DPad';
import { BlockBlast } from './easter-eggs/BlockBlast';
import { GameSelection } from './easter-eggs/GameSelection';
import { Snake } from './easter-eggs/Snake';

export const CTA: React.FC = () => {
    const { activateDPad, isDPadActive, isGameUnlocked } = useEasterEgg();
    const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const startPress = () => {
        if (isDPadActive || isGameUnlocked) return;
        // Prevent triggering if clicking specific children if needed
        pressTimer.current = setTimeout(() => {
            activateDPad();
            if (navigator.vibrate) navigator.vibrate(200);
        }, 5000);
    };

    const cancelPress = () => {
        if (pressTimer.current) clearTimeout(pressTimer.current);
    };

    return (
        <section
            className="cta-section"
            onMouseDown={startPress}
            onTouchStart={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchEnd={cancelPress}
        >
            <div className={`cta-content ${isDPadActive || isGameUnlocked ? 'hidden' : ''}`}>
                <h2>Principles for Action.</h2>
                <p>Make the most of your time. Prioritize meaningful relationships. Collaborate to improve the world.</p>
            </div>

            <DPad />

            <GameSelection />
            <BlockBlast />
            <Snake />
        </section>
    );
};
