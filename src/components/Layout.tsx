import React, { useState } from 'react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <>
            <nav className="navbar">
                <a href="#hero" className="logo">WA</a>
                <button
                    className={`mobile-menu-btn ${isMenuOpen ? 'active' : ''}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle navigation"
                >
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                </button>
                <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                    <a href="#about" onClick={() => setIsMenuOpen(false)}>About</a>
                    <a href="#work" onClick={() => setIsMenuOpen(false)}>Work</a>
                    <a href="#process" onClick={() => setIsMenuOpen(false)}>Process</a>
                    <a href="#contact" onClick={() => setIsMenuOpen(false)}>Contact</a>
                </div>
            </nav>
            <main>
                {children}
            </main>
            <footer className="site-footer">
                <p>&copy; 2025 Wally Atkins. Built with AI/LLMs/Agents.</p>
            </footer>
        </>
    );
};
