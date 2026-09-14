import React, { useEffect } from 'react';
import { trackPageView } from '../analytics';

interface PrivacyPageProps {
    onNavigate?: (path: string) => void;
}

export const PrivacyPage: React.FC<PrivacyPageProps> = ({ onNavigate }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Privacy Policy | Wally Atkins";
        trackPageView('/privacy', "Privacy Policy | Wally Atkins");
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
                <span className="legal-badge">Transparency &amp; Data Protection // Last Updated: September 2026</span>
                <h1 className="legal-title">Privacy Policy</h1>
                <p className="legal-subtitle">
                    How information is handled across wallyatkins.com and its connected suite of applications,
                    services, and automated communications.
                </p>
            </header>

            {/* Official Contact Notice */}
            <div className="legal-callout">
                <div className="legal-callout-icon">💬</div>
                <div className="legal-callout-content">
                    <h3>Official Communication &amp; Support Channel</h3>
                    <p>
                        The primary and official method to communicate with me regarding privacy questions,
                        data requests, or app support is the{' '}
                        <a href="/contact" onClick={handleContactClick} className="legal-inline-link">
                            "Get in Touch" form
                        </a>{' '}
                        located on the main page of this website.
                    </p>
                </div>
            </div>

            <article className="legal-content">
                <section className="legal-section">
                    <h2>1. Scope &amp; Purpose</h2>
                    <p>
                        This Privacy Policy applies to the personal website of Wally Atkins (<code>wallyatkins.com</code>)
                        and its connected private applications, including <strong>Wally Tasks</strong> (<code>tasks.wallyatkins.com</code>),
                        the <strong>Atkins NFL Pool</strong> (<code>football.wallyatkins.com</code>), <strong>WallyAuth SSO</strong> (<code>auth.wallyatkins.com</code>),
                        and interactive games.
                    </p>
                    <p>
                        These applications are personal, invited-member, and family-oriented digital tools created to organize tasks,
                        run social games, and share creative technology projects.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>2. Information Collected</h2>
                    <p>We collect only the minimum information necessary to provide reliable services:</p>
                    <ul>
                        <li>
                            <strong>Contact Form Submissions:</strong> When you use the "Get in Touch" form on this website,
                            we collect your name, email address, message contents, and submission timestamps.
                        </li>
                        <li>
                            <strong>Authentication &amp; User Accounts:</strong> When signing in through WallyAuth SSO, we process
                            verified OpenID Connect claims, including your user ID (<code>sub</code>), username, email address,
                            and assigned roles.
                        </li>
                        <li>
                            <strong>Pool &amp; Application Data:</strong> Weekly game picks, scoring predictions, timestamps, and
                            entry statuses for participating in the NFL Pick'em and Survivor pools.
                        </li>
                        <li>
                            <strong>First-Party Analytics (Self-Hosted Matomo):</strong> We run our own self-hosted Matomo
                            Analytics instance at <code>analytics.wallyatkins.com</code>. Matomo tracks page visits, general device
                            types (mobile vs. desktop), screen resolutions, and referral URLs. We do <strong>not</strong> use Google
                            Analytics, Meta pixels, or third-party advertising tracking networks.
                        </li>
                        <li>
                            <strong>Email Telemetry &amp; Deliverability:</strong> Automated email digests and newsletters (such as the
                            daily NFL pool morning update) may include a 1x1 transparent tracking pixel and campaign parameters
                            (<code>mtm_campaign</code>) on links to verify message deliverability, detect bounce errors, and assess
                            active participation.
                        </li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>3. How We Use Information</h2>
                    <p>Information collected is used strictly to:</p>
                    <ul>
                        <li>Respond to personal inquiries and messages submitted via the "Get in Touch" form.</li>
                        <li>Authenticate registered players and family members across applications.</li>
                        <li>Calculate pool leaderboards, verify kickoff lockout compliance, and maintain scoring records.</li>
                        <li>Send requested automated notifications, morning briefs, and kickoff alerts.</li>
                        <li>Diagnose server errors, prevent spam submissions, and maintain system integrity.</li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>4. Data Sharing &amp; Third Parties</h2>
                    <p>
                        <strong>We never sell, lease, or monetize your personal data.</strong> Your information is never provided
                        to commercial data brokers or marketing lists.
                    </p>
                    <p>
                        Data is processed exclusively through necessary hosting and server infrastructure operated by Wally Atkins,
                        including Bluehost web hosting, self-hosted PostgreSQL/MySQL/SQLite databases, and transactional mail gateways.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>5. Managing Email Notifications &amp; Unsubscribing</h2>
                    <p>
                        We respect your inbox. Automated emails dispatched by our suite of tools follow modern deliverability standards:
                    </p>
                    <ul>
                        <li>
                            <strong>One-Click Unsubscribe (RFC 8058):</strong> All automated bulk emails include native{' '}
                            <code>List-Unsubscribe</code> and <code>List-Unsubscribe-Post</code> headers, enabling instant one-click
                            unsubscribes in supported email clients (such as Apple Mail and Gmail).
                        </li>
                        <li>
                            <strong>Preference Links:</strong> The footer of every automated update includes a direct link to manage
                            notification preferences or opt out of specific email categories.
                        </li>
                    </ul>
                </section>

                <section className="legal-section">
                    <h2>6. Data Retention &amp; Your Rights</h2>
                    <p>
                        You have the right to request a review of the personal information associated with your account, update your
                        email preferences, or request the deletion of your user profile and associated records.
                    </p>
                    <p>
                        To exercise these rights, simply submit a request through the{' '}
                        <a href="/contact" onClick={handleContactClick} className="legal-inline-link">
                            "Get in Touch" form
                        </a>.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>7. Contact Information</h2>
                    <p>
                        If you have questions or feedback about this policy, please reach out directly using the{' '}
                        <a href="/contact" onClick={handleContactClick} className="legal-inline-link">
                            "Get in Touch" contact form
                        </a>{' '}
                        on this website.
                    </p>
                </section>
            </article>
        </div>
    );
};
