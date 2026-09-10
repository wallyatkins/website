import React from 'react';

export const WhimsicalLayer: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
    if (!isVisible) return null;
    return (
        <div id="whimsical-layer" aria-hidden="true">
            <div className="rainbow-bg"></div>
            <div className="floating-item unicorn">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L14.4 8.6L21 11L14.4 13.4L12 20L9.6 13.4L3 11L9.6 8.6L12 2Z" />
                </svg>
            </div>
            <div className="floating-item unicorn-2">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                </svg>
            </div>
            <div className="floating-item rainbow">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="6" opacity="0.8" />
                </svg>
            </div>
            <div className="floating-item star">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                </svg>
            </div>
        </div>
    );
};
