import React from 'react';

interface FooterProps {
    currentPath?: string;
    onNavigate?: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
    const handleInternalClick = (e: React.MouseEvent<HTMLAnchorElement>, target: string) => {
        e.preventDefault();
        // Ensure clean path format without hash
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
                    {/* Column 1: Brand & Philosophy */}
                    <div className="footer-col footer-col-brand">
                        <div className="footer-logo">WA</div>
                        <h3 className="footer-brand-title">Wally Atkins</h3>
                        <p className="footer-brand-desc">
                            Creator, software engineer, and systems architect. Building purposeful applications,
                            playful retro games, and automated agentic workflows.
                        </p>
                        <div className="footer-principles">
                            <span className="footer-principles-label">Principles for Action:</span>
                            <p className="footer-principles-text">
                                Make the most of time. Prioritize meaningful relationships. Collaborate to improve the world.
                            </p>
                        </div>
                    </div>

                    {/* Column 2: Apps & Ecosystem */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Apps &amp; Ecosystem</h4>
                        <ul className="footer-nav-list">
                            <li>
                                <a
                                    href="https://mud.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link external-link"
                                >
                                    <span className="footer-link-icon">⚔️</span> WallyMUD
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://wheres.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link external-link"
                                >
                                    <span className="footer-link-icon">🗺️</span> Where's Wally
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://stories.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link external-link"
                                >
                                    <span className="footer-link-icon">🎥</span> Video Stories
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://football.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link external-link"
                                >
                                    <span className="footer-link-icon">🏈</span> Atkins NFL Pool
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://tasks.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link external-link"
                                >
                                    <span className="footer-link-icon">📋</span> Wally Tasks
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/games"
                                    onClick={(e) => handleInternalClick(e, '/games')}
                                    className="footer-link"
                                >
                                    <span className="footer-link-icon">🎮</span> Retro Games &amp; MUDs
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/work"
                                    onClick={(e) => handleInternalClick(e, '/work')}
                                    className="footer-link"
                                >
                                    <span className="footer-link-icon">💡</span> Selected Projects
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Column 3: Accounts & Identity */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Accounts &amp; SSO</h4>
                        <ul className="footer-nav-list">
                            <li>
                                <a
                                    href="https://auth.wallyatkins.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link external-link"
                                >
                                    <span className="footer-link-icon">🔐</span> WallyAuth Single Sign-On
                                </a>
                            </li>
                            <li>
                                <a
                                    href="https://auth.wallyatkins.com/account"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="footer-link external-link"
                                >
                                    <span className="footer-link-icon">👤</span> Profile &amp; Sessions
                                </a>
                            </li>
                            <li>
                                <span className="footer-note">
                                    Unified OIDC PKCE security protecting all apps in the suite.
                                </span>
                            </li>
                        </ul>
                    </div>

                    {/* Column 4: Contact & Support */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Contact &amp; Support</h4>
                        <ul className="footer-nav-list">
                            <li>
                                <a
                                    href="/contact"
                                    onClick={(e) => handleInternalClick(e, '/contact')}
                                    className="footer-link footer-highlight-link"
                                >
                                    <span className="footer-link-icon">✉️</span> Get in Touch Form
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/contact"
                                    onClick={(e) => handleInternalClick(e, '/contact')}
                                    className="footer-link"
                                >
                                    <span className="footer-link-icon">🛠️</span> App Support &amp; Inquiries
                                </a>
                            </li>
                            <li>
                                <p className="footer-support-note">
                                    The official method to communicate with me for support, feedback, or requesting an app account is the <strong>Get in Touch</strong> form right here on this website.
                                </p>
                            </li>
                        </ul>
                    </div>

                    {/* Column 5: Legal & Transparency */}
                    <div className="footer-col">
                        <h4 className="footer-heading">Legal &amp; Policies</h4>
                        <ul className="footer-nav-list">
                            <li>
                                <a
                                    href="/privacy"
                                    onClick={(e) => handleInternalClick(e, '/privacy')}
                                    className="footer-link"
                                >
                                    <span className="footer-link-icon">🔒</span> Privacy Policy
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/terms"
                                    onClick={(e) => handleInternalClick(e, '/terms')}
                                    className="footer-link"
                                >
                                    <span className="footer-link-icon">📜</span> Terms of Use
                                </a>
                            </li>
                            <li>
                                <span className="footer-note">
                                    Self-hosted Matomo analytics with privacy-preserving telemetry and no ad tracking.
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="footer-bottom">
                    <div className="footer-bottom-left">
                        <p className="footer-copyright">
                            &copy; {new Date().getFullYear()} Wally Atkins. All rights reserved.
                        </p>
                        <span className="footer-badge">Built with AI &amp; Agentic Systems</span>
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
