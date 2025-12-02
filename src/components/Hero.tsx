import React from 'react';

interface HeroProps {
    isLightMode: boolean;
    isArtMode: boolean;
    toggleTheme: () => void;
}

export const Hero: React.FC<HeroProps> = ({ isLightMode, isArtMode, toggleTheme }) => {
    const profileImage = isArtMode
        ? (isLightMode ? 'profile-white-art.jpg' : 'profile-black-art.jpg')
        : (isLightMode ? 'profile-white.jpg' : 'profile-black.jpg');

    return (
        <section id="hero" className="hero-section">
            <div className="hero-content">
                <h1 className="hero-title">Hello, I'm <br /><span className="highlight">Wally.</span></h1>
                <p className="hero-subtitle">Creator. Technologist. Catalyst.<br />Fusing creativity with logic.</p>
            </div>
            <div className="hero-image-container">
                <img
                    src={profileImage}
                    alt="Wally Atkins"
                    className="hero-image"
                    onDoubleClick={toggleTheme}
                />
            </div>
        </section>
    );
};
