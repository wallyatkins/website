import React, { useRef } from 'react';
import { useEasterEgg } from '../context/EasterEggContext';

export const Projects: React.FC<{ onNavigate?: (path: string) => void }> = ({ onNavigate }) => {
    const { activateZoltar } = useEasterEgg();
    const rubCount = useRef(0);
    const lastX = useRef(0);
    const lastDirection = useRef(0);
    const rubTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const handleRub = (e: React.MouseEvent | React.TouchEvent) => {
        let x: number;
        if ('touches' in e) {
            x = e.touches[0].clientX;
        } else {
            x = e.clientX;
        }

        const delta = x - lastX.current;
        const direction = delta > 0 ? 1 : -1;

        if (Math.abs(delta) > 2) {
            if (direction !== lastDirection.current) {
                rubCount.current++;
                lastDirection.current = direction;
                if (rubTimer.current) clearTimeout(rubTimer.current);
                rubTimer.current = setTimeout(() => { rubCount.current = 0; }, 500);
            }
        }
        lastX.current = x;

        if (rubCount.current > 10) {
            activateZoltar();
            rubCount.current = 0;
        }
    };

    return (
        <section id="work" className="content-section">
            <h2 className="section-title">Ecosystem &amp; Projects</h2>
            <div className="project-list">
                {/* 1. WallyMUD & Retro Worlds */}
                <div className="project-item">
                    <span className="project-category">Gaming &amp; Systems</span>
                    <div className="project-info">
                        <h3 className="project-name">
                            <a
                                href="/games"
                                className="project-name-link"
                                onClick={(e) => {
                                    if (onNavigate) {
                                        e.preventDefault();
                                        onNavigate('/games');
                                    }
                                }}
                            >
                                WallyMUD &amp; Retro Worlds
                            </a>
                        </h3>
                        <p className="project-desc">
                            From dialing UVA Unix terminals via 2400-baud modems in 1991 to re-architecting Merc DikuMUD into modern Java and building a mobile-first touch-control web MUD in PHP.
                        </p>
                    </div>
                    <div className="project-links">
                        <a
                            href="https://mud.wallyatkins.com"
                            target="_blank"
                            rel="noreferrer"
                            className="project-link"
                        >
                            Play Live MUD ↗
                        </a>
                        <a
                            href="/games"
                            className="project-link"
                            onClick={(e) => {
                                if (onNavigate) {
                                    e.preventDefault();
                                    onNavigate('/games');
                                }
                            }}
                        >
                            Chronicle ↗
                        </a>
                    </div>
                </div>

                {/* 2. Where's Wally Location Tracker */}
                <div className="project-item">
                    <span className="project-category">Interactive Maps</span>
                    <div className="project-info">
                        <h3 className="project-name">
                            <a
                                href="https://wheres.wallyatkins.com"
                                target="_blank"
                                rel="noreferrer"
                                className="project-name-link"
                            >
                                Where's Wally
                            </a>
                        </h3>
                        <p className="project-desc">
                            An ultra-high-resolution Deep Zoom (DZI) interactive map and travel chronicle. Built with responsive multi-scale tile rendering and location telemetry.
                        </p>
                    </div>
                    <div className="project-links">
                        <a
                            href="https://wheres.wallyatkins.com"
                            target="_blank"
                            rel="noreferrer"
                            className="project-link"
                        >
                            Explore Map ↗
                        </a>
                    </div>
                </div>

                {/* 3. Video Stories */}
                <div className="project-item">
                    <span className="project-category">Web Platform</span>
                    <div className="project-info">
                        <h3 className="project-name">
                            <a
                                href="https://stories.wallyatkins.com"
                                target="_blank"
                                rel="noreferrer"
                                className="project-name-link"
                            >
                                Video Stories
                            </a>
                        </h3>
                        <p className="project-desc">
                            A prompt-and-response video storytelling service designed for meaningful 1-on-1 human interaction rather than broadcast social noise. Secure media pipelines with private delivery.
                        </p>
                    </div>
                    <div className="project-links">
                        <a
                            href="https://stories.wallyatkins.com"
                            target="_blank"
                            rel="noreferrer"
                            className="project-link"
                        >
                            Launch Stories ↗
                        </a>
                    </div>
                </div>

                {/* 4. Atkins NFL Pool */}
                <div className="project-item">
                    <span className="project-category">Sports Analytics</span>
                    <div className="project-info">
                        <h3 className="project-name">
                            <a
                                href="https://football.wallyatkins.com"
                                target="_blank"
                                rel="noreferrer"
                                className="project-name-link"
                            >
                                Atkins NFL Pool
                            </a>
                        </h3>
                        <p className="project-desc">
                            A private tournament platform featuring straight-up Pick'em with Game of the Week tiebreaker point differentials, season-long Survivor pool tracking, and automated morning email digest briefings.
                        </p>
                    </div>
                    <div className="project-links">
                        <a
                            href="https://football.wallyatkins.com"
                            target="_blank"
                            rel="noreferrer"
                            className="project-link"
                        >
                            View League ↗
                        </a>
                    </div>
                </div>

                {/* 5. Wally Tasks */}
                <div className="project-item">
                    <span className="project-category">Productivity &amp; AI</span>
                    <div className="project-info">
                        <h3 className="project-name">
                            <a
                                href="https://tasks.wallyatkins.com"
                                target="_blank"
                                rel="noreferrer"
                                className="project-name-link"
                            >
                                Wally Tasks
                            </a>
                        </h3>
                        <p className="project-desc">
                            Personal productivity suite and agentic task orchestration. Features priority scoring, review state transitions, file attachments, and cross-platform synchronization.
                        </p>
                    </div>
                    <div className="project-links">
                        <a
                            href="https://tasks.wallyatkins.com"
                            target="_blank"
                            rel="noreferrer"
                            className="project-link"
                        >
                            Open Tasks ↗
                        </a>
                    </div>
                </div>

                {/* 6. WallyAuth SSO */}
                <div className="project-item">
                    <span className="project-category">Identity &amp; Security</span>
                    <div className="project-info">
                        <h3 className="project-name">
                            <a
                                href="https://auth.wallyatkins.com"
                                target="_blank"
                                rel="noreferrer"
                                className="project-name-link"
                            >
                                WallyAuth SSO
                            </a>
                        </h3>
                        <p className="project-desc">
                            A centralized OpenID Connect (OIDC) identity provider with PKCE and dual-driver SQLite/MySQL persistence. Provides seamless single sign-on across all subdomains and services.
                        </p>
                    </div>
                    <div className="project-links">
                        <a
                            href="https://auth.wallyatkins.com"
                            target="_blank"
                            rel="noreferrer"
                            className="project-link"
                        >
                            Auth Portal ↗
                        </a>
                    </div>
                </div>

                {/* 7. Zoltar */}
                <div className="project-item">
                    <span className="project-category">AI Workflow</span>
                    <div className="project-info">
                        <h3
                            className="project-name"
                            onMouseMove={handleRub}
                            onTouchMove={handleRub}
                            style={{ cursor: 'pointer' }}
                            title="Rub the title to awaken Zoltar"
                        >
                            Zoltar
                        </h3>
                        <p className="project-desc">
                            An agentic "magic genie" workflow. Leverages autonomous multi-agent tool execution, complex automation, and webhooks to grant user wishes and execute real-world tasks.
                        </p>
                    </div>
                    <div className="project-links">
                        <a
                            href="https://github.com/wallyatkins"
                            target="_blank"
                            rel="noreferrer"
                            className="project-link"
                        >
                            GitHub ↗
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
};
