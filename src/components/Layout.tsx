import React, { useState } from 'react';
import { Footer } from './Footer';

interface LayoutProps {
    children: React.ReactNode;
    currentPath?: string;
    onNavigate?: (path: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPath = '/', onNavigate }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            <main>
                {children}
            </main>
            <Footer currentPath={currentPath} onNavigate={onNavigate} />
        </>
    );
};
