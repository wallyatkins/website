import React, { useState } from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';

export const DPad: React.FC = () => {
    const { isDPadActive, closeDPad, unlockGame } = useEasterEgg();
    const [konamiIndex, setKonamiIndex] = useState(0);
    const konamiCode = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];

    const handlePress = (dir: string) => {
        if (navigator.vibrate) navigator.vibrate(50);

        if (dir === konamiCode[konamiIndex]) {
            const nextIndex = konamiIndex + 1;
            setKonamiIndex(nextIndex);
            if (nextIndex === konamiCode.length) {
                unlockGame();
                setKonamiIndex(0);
            }
        } else {
            setKonamiIndex(0);
        }
    };

    if (!isDPadActive) return null;

    return (
        <div id="dpad-container">
            <div
                id="dpad-close-btn"
                onClick={(e) => { e.stopPropagation(); closeDPad(); }}
                style={{ position: 'absolute', top: -40, right: 0, fontSize: '2rem', cursor: 'pointer', color: 'var(--text-color)' }}
            >
                &times;
            </div>
            <div className="dpad">
                <div className="dpad-up" onClick={(e) => { e.stopPropagation(); handlePress('up'); }}></div>
                <div className="dpad-right" onClick={(e) => { e.stopPropagation(); handlePress('right'); }}></div>
                <div className="dpad-down" onClick={(e) => { e.stopPropagation(); handlePress('down'); }}></div>
                <div className="dpad-left" onClick={(e) => { e.stopPropagation(); handlePress('left'); }}></div>
                <div className="dpad-center"></div>
            </div>
            <p className="dpad-hint">Unlock the Secret</p>
        </div>
    );
};
