import React, { useState } from 'react';
import { Footer } from './Footer';
import { usePWA } from '../hooks/usePWA';

interface LayoutProps {
    children: React.ReactNode;
    currentPath?: string;
    onNavigate?: (path: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPath = '/', onNavigate }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const { canInstall, needRefresh, installApp, updateApp } = usePWA();

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetPath: string) => {
        setIsMenuOpen(false);
        if (onNavigate) {
            e.preventDefault();
            onNavigate(targetPath);
        }
    };

    return (
        <>
            <nav className="navbar">
                <a
                    href="/"
                    className="logo"
                    onClick={(e) => handleNavClick(e, '/')}
                >
                    WA
                </a>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {canInstall && (
                        <button
                            className="nav-install-btn"
                            onClick={installApp}
                            title="Install Wally Atkins Progressive Web App"
                        >
                            📱 Install App
                        </button>
                    )}
                    <button
                        className={`mobile-menu-btn ${isMenuOpen ? 'active' : ''}`}
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        aria-label="Toggle navigation"
                    >
                        <span className="bar"></span>
                        <span className="bar"></span>
                        <span className="bar"></span>
                    </button>
                </div>
                <div className={`nav-links ${isMenuOpen ? 'active' : ''}`}>
                    <a
                        href="/apps"
                        className={currentPath === '/apps' ? 'active' : ''}
                        onClick={(e) => handleNavClick(e, '/apps')}
                        style={{ color: '#38bdf8', fontWeight: 700 }}
                    >
                        Apps ⚡
                    </a>
                    <a
                        href="/about"
                        className={currentPath === '/about' ? 'active' : ''}
                        onClick={(e) => handleNavClick(e, '/about')}
                    >
                        About
                    </a>
                    <a
                        href="/work"
                        className={currentPath === '/work' ? 'active' : ''}
                        onClick={(e) => handleNavClick(e, '/work')}
                    >
                        Work
                    </a>
                    <a
                        href="/games"
                        className={currentPath === '/games' ? 'active' : ''}
                        onClick={(e) => handleNavClick(e, '/games')}
                    >
                        Games
                    </a>
                    <a
                        href="/process"
                        className={currentPath === '/process' ? 'active' : ''}
                        onClick={(e) => handleNavClick(e, '/process')}
                    >
                        Process
                    </a>
                    <a
                        href="/contact"
                        className={currentPath === '/contact' ? 'active' : ''}
                        onClick={(e) => handleNavClick(e, '/contact')}
                    >
                        Contact
                    </a>
                </div>
            </nav>

            {needRefresh && (
                <div className="pwa-update-bar">
                    <span>A new version of the portal is available!</span>
                    <button onClick={updateApp}>Update Now</button>
                </div>
            )}

            <main>
                {children}
            </main>
            <Footer currentPath={currentPath} onNavigate={onNavigate} />
        </>
    );
};
