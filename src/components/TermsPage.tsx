import React, { useEffect } from 'react';
import { trackPageView } from '../analytics';

interface TermsPageProps {
    onNavigate?: (path: string) => void;
}

export const TermsPage: React.FC<TermsPageProps> = ({ onNavigate }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Terms of Use | Wally Atkins";
        trackPageView('/terms', "Terms of Use | Wally Atkins");
    }, []);

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onNavigate) {
            onNavigate('/');
        } else {
            window.location.href = '/';
        }
    };

    const handleContactClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onNavigate) {
            onNavigate('/contact');
        } else {
            window.location.href = '/contact';
        }
    };

    return (
        <div className="legal-page">
            <header className="legal-header">
                <a href="/" onClick={handleBack} className="legal-back-link">
                    ← Back to Home
                </a>
                <span className="legal-badge">Service Terms &amp; Guidelines // Last Updated: September 2026</span>
                <h1 className="legal-title">Terms of Use</h1>
                <p className="legal-subtitle">
                    Guidelines, expectations, and rules of engagement for using wallyatkins.com and its connected
                    suite of web applications and tools.
                </p>
            </header>

            {/* Official Contact Notice */}
            <div className="legal-callout">
                <div className="legal-callout-icon">💬</div>
                <div className="legal-callout-content">
                    <h3>Questions or Support Requests</h3>
                    <p>
                        To reach Wally Atkins regarding any questions, bug reports, or support needs, please use the official{' '}
                        <a href="/contact" onClick={handleContactClick} className="legal-inline-link">
                            "Get in Touch" form
                        </a>{' '}
                        on the home page.
                    </p>
                </div>
            </div>

            <article className="legal-content">
                <section className="legal-section">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using this website (<code>wallyatkins.com</code>) or any linked services operated by
                        Wally Atkins (including the Atkins NFL Pool, Wally Tasks, and WallyAuth SSO), you agree to be bound by
                        these Terms of Use. If you do not agree with any of these terms, you should discontinue use of the site
                        and applications.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>2. Purpose &amp; Private Nature of Services</h2>
                    <p>
                        The applications and services hosted across this domain are developed and operated by Wally Atkins for personal,
                        family, educational, and invited-community participation. They are provided as non-commercial technology
                        projects and social recreation tools.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>3. Account Security &amp; WallyAuth SSO</h2>
                    <p>
                        Access to certain applications requires authentication through WallyAuth Single Sign-On. You are responsible for
                        maintaining the confidentiality of your session credentials and ensuring that trusted devices are kept secure.
                        You agree to notify Wally Atkins promptly of any unauthorized access or security concerns.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>4. Community &amp; Game Pool Rules</h2>
                    <p>
                        For participants in gaming and sports applications (such as the Atkins NFL Pool):
                    </p>
                    <ul>
                        <li>
                            <strong>Automated Lockouts:</strong> Weekly game picks and survivor selections lock automatically at
                            the official scheduled kickoff time of each individual matchup. Late submissions cannot be honored.
                        </li>
                        <li>
                            <strong>Anti-Cheat &amp; Pick Visibility:</strong> Opponent selections are shielded until respective
                            kickoffs to maintain fair play across the league.
                        </li>
                        <li>
                            <strong>Commissioner Discretion:</strong> In the event of unforeseen game cancellations, NFL schedule
                            rearrangements, or upstream data feed errors, the league commissioner reserves the right to make final,
                            fair determinations for the league.
                        </li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>5. Acceptable Use</h2>
                    <p>When interacting with these services, you agree not to:</p>
                    <ul>
                        <li>Interfere with, disrupt, or place an unreasonable load on server infrastructure or APIs.</li>
                        <li>Attempt to bypass authentication mechanisms, authorization boundaries, or lockout timers.</li>
                        <li>Submit malicious code, abusive messages, or automated spam through the contact or communication forms.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>6. Disclaimer of Warranties &amp; Limitation of Liability</h2>
                    <p>
                        All services, code, and content are provided on an <strong>"as-is"</strong> and <strong>"as-available"</strong> basis
                        without warranties of any kind, whether express or implied.
                    </p>
                    <p>
                        Wally Atkins makes no guarantee that services will be uninterrupted, error-free, or that external feeds
                        (such as sports score APIs or third-party email delivery gateways) will be instantaneously accurate. In no event
                        shall Wally Atkins be liable for any indirect, incidental, or consequential damages arising from the use of
                        or inability to use these applications.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>7. Modifications to Terms</h2>
                    <p>
                        These terms may be updated periodically to reflect changes in available applications, legal guidelines, or system
                        features. Continued use of the website and services following updates constitutes acceptance of the revised terms.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>8. How to Contact</h2>
                    <p>
                        For questions regarding these terms, or to report an issue, please use the official{' '}
                        <a href="/contact" onClick={handleContactClick} className="legal-inline-link">
                            "Get in Touch" contact form
                        </a>.
                    </p>
                </section>
            </article>
        </div>
    );
};
