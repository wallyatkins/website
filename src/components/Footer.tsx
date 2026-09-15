import React from 'react';

interface FooterProps {
    currentPath?: string;
    onNavigate?: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
    const handleInternalClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
        e.preventDefault();
        let clean = target.replace(/^\/?#/, '/');
        if (!clean.startsWith('/')) clean = `/${clean}`;
        if (clean === '/hero') clean = '/';

        if (onNavigate) {
            onNavigate(clean);
        } else {
            window.location.href = clean;
        }
    };

    const scrollToTop = () => {
        if (onNavigate) {
            onNavigate('/');
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <footer className="site-footer" role="contentinfo">
            <div className="footer-container">
                <div className="footer-grid">
                    {/* Column 1: Identity */}
                    <div className="footer-col footer-col-brand">
                        <a
                            href="/"
                            className="logo footer-brand-logo"
                            onClick={(e) => handleInternalClick(e, '/')}
                        >
                            WA
                        </a>
                        <h3 className="footer-brand-title">Wally Atkins</h3>
                        <p className="footer-brand-desc">
                            Creator, software engineer, and systems architect. Crafting purposeful applications,
                            retro virtual worlds, and intelligent workflows.
                        </p>
                    </div>

                    {/* Column 2: Navigation */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Explore</h4>
                        <ul className="footer-nav-list">
                            <li>
                                <a
                                    href="/about"
                                    onClick={(e) => handleInternalClick(e, '/about')}
                                    className="footer-link"
                                >
                                    About
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/work"
                                    onClick={(e) => handleInternalClick(e, '/work')}
                                    className="footer-link"
                                >
                                    Work
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/games"
                                    onClick={(e) => handleInternalClick(e, '/games')}
                                    className="footer-link"
                                >
                                    Games
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/process"
                                    onClick={(e) => handleInternalClick(e, '/process')}
                                    className="footer-link"
                                >
                                    Process
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/contact"
                                    onClick={(e) => handleInternalClick(e, '/contact')}
                                    className="footer-link"
                                >
                                    Contact
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Applications & Ecosystem */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Applications</h4>
                        <ul className="footer-nav-list">
                            <li>
                                <a
                                    href="https://mud.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link"
                                >
                                    WallyMUD
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://wheres.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link"
                                >
                                    Where's Wally
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://stories.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link"
                                >
                                    Video Stories
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://football.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link"
                                >
                                    Atkins NFL Pool
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://tasks.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link"
                                >
                                    Wally Tasks
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://auth.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link"
                                >
                                    WallyAuth SSO
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Transparency & Legal */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Transparency</h4>
                        <ul className="footer-nav-list">
                            <li>
                                <a
                                    href="/privacy"
                                    onClick={(e) => handleInternalClick(e, '/privacy')}
                                    className="footer-link"
                                >
                                    Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/terms"
                                    onClick={(e) => handleInternalClick(e, '/terms')}
                                    className="footer-link"
                                >
                                    Terms of Use
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/contact"
                                    onClick={(e) => handleInternalClick(e, '/contact')}
                                    className="footer-link"
                                >
                                    Get in Touch
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="footer-bottom">
                    <div className="footer-bottom-left">
                        <p className="footer-copyright">
                            &copy; {new Date().getFullYear()} Wally Atkins. Built with AI/LLMs/Agents.
                        </p>
                    </div>

                    <div className="footer-bottom-right">
                        <button
                            type="button"
                            onClick={scrollToTop}
                            className="footer-back-to-top"
                            aria-label="Scroll back to top"
                        >
                            Back to top ↑
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
};
