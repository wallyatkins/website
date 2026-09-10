import React, { useState } from 'react';

interface LayoutProps {
    children: React.ReactNode;
    currentPath?: string;
    onNavigate?: (path: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentPath = '/', onNavigate }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const isGamesPage = currentPath.startsWith('/games');

    const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetPath: string, hash?: string) => {
        setIsMenuOpen(false);
        if (onNavigate) {
            e.preventDefault();
            onNavigate(hash ? `/${hash}` : targetPath);
        }
    };

    return (
        <>
            <nav className="navbar">
                <a
                    href={isGamesPage ? '/' : '#hero'}
                    className="logo"
                    onClick={(e) => {
                        if (isGamesPage && onNavigate) {
                            e.preventDefault();
                            onNavigate('/');
                        }
                    }}
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
                        href={isGamesPage ? '/#about' : '#about'}
                        onClick={(e) => isGamesPage && handleNavClick(e, '/', '#about')}
                    >
                        About
                    </a>
                    <a
                        href={isGamesPage ? '/#work' : '#work'}
                        onClick={(e) => isGamesPage && handleNavClick(e, '/', '#work')}
                    >
                        Work
                    </a>
                    <a
                        href="/games"
                        className={isGamesPage ? 'active' : ''}
                        onClick={(e) => !isGamesPage && handleNavClick(e, '/games')}
                    >
                        Games
                    </a>
                    <a
                        href={isGamesPage ? '/#process' : '#process'}
                        onClick={(e) => isGamesPage && handleNavClick(e, '/', '#process')}
                    >
                        Process
                    </a>
                    <a
                        href={isGamesPage ? '/#contact' : '#contact'}
                        onClick={(e) => isGamesPage && handleNavClick(e, '/', '#contact')}
                    >
                        Contact
                    </a>
                </div>
            </nav>
            <main>
                {children}
            </main>
            <footer className="site-footer">
                <p>&copy; {new Date().getFullYear()} Wally Atkins. Built with AI/LLMs/Agents.</p>
            </footer>
        </>
    );
};
