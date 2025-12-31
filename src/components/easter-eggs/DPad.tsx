import React, { useState } from 'react';
import { useEasterEgg } from '../../context/EasterEggContext';

interface DirectionalPadProps {
    onPress: (dir: 'up' | 'down' | 'left' | 'right') => void;
    onClose?: () => void;
    className?: string;
    style?: React.CSSProperties;
    showHint?: boolean;
}

export const DirectionalPad: React.FC<DirectionalPadProps> = ({ onPress, onClose, className, style, showHint }) => {
    const handlePress = (e: React.MouseEvent, dir: 'up' | 'down' | 'left' | 'right') => {
        e.stopPropagation();
        if (navigator.vibrate) navigator.vibrate(50);
        onPress(dir);
    };

    return (
        <div id="dpad-container" className={className} style={style}>
            {onClose && (
                <div
                    id="dpad-close-btn"
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    style={{ position: 'absolute', top: -40, right: 0, fontSize: '2rem', cursor: 'pointer', color: 'var(--text-color)' }}
                >
                    &times;
                </div>
            )}
            <div className="dpad">
                <div className="dpad-up" onClick={(e) => handlePress(e, 'up')}></div>
                <div className="dpad-right" onClick={(e) => handlePress(e, 'right')}></div>
                <div className="dpad-down" onClick={(e) => handlePress(e, 'down')}></div>
                <div className="dpad-left" onClick={(e) => handlePress(e, 'left')}></div>
                <div className="dpad-center"></div>
            </div>
            {showHint && <p className="dpad-hint">Unlock the Secret</p>}
        </div>
    );
};

export const DPad: React.FC = () => {
    const { isDPadActive, closeDPad, unlockGame } = useEasterEgg();
    const [konamiIndex, setKonamiIndex] = useState(0);
    const konamiCode = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];

    const handlePress = (dir: 'up' | 'down' | 'left' | 'right') => {
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

    return <DirectionalPad onPress={handlePress} onClose={closeDPad} showHint={true} />;
};
