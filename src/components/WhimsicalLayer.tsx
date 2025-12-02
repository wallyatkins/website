import React from 'react';

export const WhimsicalLayer: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
    if (!isVisible) return null;
    return (
        <div id="whimsical-layer">
            <div className="rainbow-bg"></div>
            <div className="floating-item unicorn">🦄</div>
            <div className="floating-item unicorn-2">🦄</div>
            <div className="floating-item rainbow">🌈</div>
            <div className="floating-item star">✨</div>
        </div>
    );
};
