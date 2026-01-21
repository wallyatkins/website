import React, { useRef, Suspense } from 'react';
import { useEasterEgg } from '../context/EasterEggContext';
import { DPad } from './easter-eggs/DPad';
import { GameSelection } from './easter-eggs/GameSelection';

const BlockBlast = React.lazy(() => import('./easter-eggs/BlockBlast').then(module => ({ default: module.BlockBlast })));
const Snake = React.lazy(() => import('./easter-eggs/Snake').then(module => ({ default: module.Snake })));
const GeometryDash = React.lazy(() => import('./easter-eggs/GeometryDash').then(module => ({ default: module.GeometryDash })));

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

            <Suspense fallback={<div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999 }}></div>}>
                <BlockBlast />
                <Snake />
                <GeometryDash />
            </Suspense>
        </section>
    );
};
