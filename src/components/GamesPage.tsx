import React, { useEffect } from 'react';

interface GamesPageProps {
    onNavigate?: (path: string) => void;
}

export const GamesPage: React.FC<GamesPageProps> = ({ onNavigate }) => {
    useEffect(() => {
        window.scrollTo(0, 0);
        document.title = "Games & MUDs | Wally Atkins";
    }, []);

    const handleBack = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onNavigate) {
            onNavigate('/#work');
        } else {
            window.location.href = '/#work';
        }
    };

    return (
        <div className="games-page">
            <header className="games-header">
                <a href="/#work" onClick={handleBack} className="games-back-link">
                    ← Back to Portfolio
                </a>
                <span className="games-badge">Retro Computing & Virtual Worlds // 1991 — Present</span>
                <h1 className="games-title">My Journey with Games & MUDs</h1>
                <p className="games-subtitle">
                    From dialing directly into University of Virginia Unix terminals in 1991 to building a mobile-first, pocket-sized MUD engine today.
                </p>
            </header>

            {/* 1991 Genesis Section */}
            <section className="games-section">
                <div className="games-grid-two-col">
                    <div className="games-story-text">
                        <h2 className="games-section-heading">The 1991 Genesis</h2>
                        <p className="games-prose">
                            My journey with MUDs started in 1991. Back then, my introduction to the internet wasn’t a web browser—it was dialing directly into Unix servers at the University of Virginia, thanks to account access set up by John Gaffel (of turing.org fame).
                        </p>
                        <p className="games-prose">
                            That green-and-black terminal connection became my gateway to text-based virtual worlds, and I spent countless late nights throughout high school and college exploring dungeons, typing out frantic combat commands, and hanging out in virtual taverns.
                        </p>
                        <p className="games-prose">
                            Life eventually moved forward, careers and families took center stage, and the telnet sessions faded into memory. But the nostalgia never entirely left.
                        </p>
                    </div>

                    <div className="games-terminal-card" aria-label="Simulated 1991 Unix dial-up terminal">
                        <div className="games-terminal-header">
                            <span className="term-dot term-dot-red"></span>
                            <span className="term-dot term-dot-yellow"></span>
                            <span className="term-dot term-dot-green"></span>
                            <span className="term-title">dialup.uva.edu - VT100 - 2400 baud</span>
                        </div>
                        <div className="games-terminal-body">
                            <p className="term-dim">ATDT 804-924-XXXX</p>
                            <p className="term-dim">CONNECT 2400 V.42bis</p>
                            <p className="term-bright">Ultrix-32 V4.2 (Rev. 96) (uva.edu)</p>
                            <p>login: <span className="term-highlight">matkins</span></p>
                            <p>Password: ••••••••</p>
                            <p className="term-dim">[UVA Unix Host ~ VT100 Session Active]</p>
                            <p>$ telnet mud.realm.uva.edu 4000</p>
                            <p className="term-green">Connected to Merc MUD 2.1.</p>
                            <p className="term-green">By what name do you wish to be known? <span className="term-cursor">█</span></p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Rediscovery & Evolution Section */}
            <section className="games-section">
                <h2 className="games-section-heading">Rediscovery & Technical Evolution</h2>
                <p className="games-lead-text">
                    Decades later, I stumbled across the original Merc MUD C codebase on GitHub. Seeing those old room files and combat loops sparked an itch to build something again. What started as an experiment in porting the core C architecture over to a modern Java engine eventually evolved into a full web-based project built with PHP.
                </p>

                <div className="games-evolution-grid">
                    <div className="games-card">
                        <span className="card-phase">Phase 01 // Archaeology</span>
                        <h3 className="card-title">Merc MUD (C Engine)</h3>
                        <p className="card-desc">
                            The classic 1993 Diku/Merc codebase. Single-threaded select() event loop, raw file-based area parsing (.are syntax), pointer manipulation, and pure terminal output.
                        </p>
                        <a
                            href="https://github.com/alexmchale/merc-mud"
                            target="_blank"
                            rel="noreferrer"
                            className="card-link"
                        >
                            View C Reference ↗
                        </a>
                    </div>

                    <div className="games-card">
                        <span className="card-phase">Phase 02 // Architecture</span>
                        <h3 className="card-title">Java Merc MUD</h3>
                        <p className="card-desc">
                            A complete ground-up re-architecture in modern Java. Clean object-oriented domain models, type-safe entity hierarchies, thread-safe memory management, and structured world parsers.
                        </p>
                        <a
                            href="https://github.com/wallyatkins/java-merc-mud"
                            target="_blank"
                            rel="noreferrer"
                            className="card-link"
                        >
                            GitHub Repository ↗
                        </a>
                    </div>

                    <div className="games-card highlighted-card">
                        <span className="card-phase">Phase 03 // Reimagination</span>
                        <h3 className="card-title">WallyMUD (Web & Mobile)</h3>
                        <p className="card-desc">
                            A modern web-first deployment using lightweight PHP, SQLite persistence, and polling engine ticks—paired with a touch-first interface engineered for modern phone screens.
                        </p>
                        <a
                            href="https://github.com/wallyatkins/WallyMud"
                            target="_blank"
                            rel="noreferrer"
                            className="card-link"
                        >
                            GitHub Repository ↗
                        </a>
                    </div>
                </div>
            </section>

            {/* Mobile Touch Control Deck Innovations */}
            <section className="games-section">
                <h2 className="games-section-heading">Reimagining the MUD for Modern Pockets</h2>
                <p className="games-lead-text">
                    The biggest challenge—and the most fun part—was reimagining how a MUD plays today. The barrier to enjoying these classic games on modern devices has always been the interface: nobody wants to peck frantically on an on-screen mobile keyboard while trying to flee a dragon.
                </p>
                <p className="games-lead-text">
                    To solve that, I built a mobile-first touch control deck:
                </p>

                <div className="games-features-grid">
                    <div className="feature-item">
                        <div className="feature-icon">🧭</div>
                        <div className="feature-content">
                            <h3 className="feature-title">Permanent Navigation Matrix</h3>
                            <p className="feature-desc">
                                Standard direction controls where blocked doors and secret paths remain clickable, preserving the thrill of discovery without UI spoilers. Visible exits illuminate with a glowing accent, but unseen walls remain tactile.
                            </p>
                        </div>
                    </div>

                    <div className="feature-item">
                        <div className="feature-icon">⚡</div>
                        <div className="feature-content">
                            <h3 className="feature-title">Context-Aware Action Deck</h3>
                            <p className="feature-desc">
                                A streamlined 3-row button grid that lets you drill down into class-specific skills (like backstabs or spells), manage inventory, and interact with the room without summoning the virtual keyboard.
                            </p>
                        </div>
                    </div>

                    <div className="feature-item">
                        <div className="feature-icon">🚨</div>
                        <div className="feature-content">
                            <h3 className="feature-title">Smart Combat States</h3>
                            <p className="feature-desc">
                                Dynamic cues that keep attention where it belongs. An emergency flee button pulses with a rhythmic glowing red alarm the moment combat begins, so escape is always one tap away.
                            </p>
                        </div>
                    </div>

                    <div className="feature-item">
                        <div className="feature-icon">🎨</div>
                        <div className="feature-content">
                            <h3 className="feature-title">Atmospheric Visuals</h3>
                            <p className="feature-desc">
                                Handcrafted area lore paired with classic Dungeons &amp; Dragons-style artwork across diverse mediums—watercolor, ink, charcoal, and field sketches—to bring the text to life visually while keeping the main console text as the centerpiece.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Philosophy Callout */}
            <section className="games-section games-philosophy-section">
                <blockquote className="games-quote">
                    "This isn’t a commercial venture, and there are no grand plans to build an empire. It's a passion project and a love letter to the early 90s internet—rebuilt so it can live comfortably in your pocket."
                </blockquote>
                <div className="games-cta-buttons">
                    <a
                        href="https://github.com/wallyatkins/java-merc-mud"
                        target="_blank"
                        rel="noreferrer"
                        className="games-btn"
                    >
                        Explore Java Merc MUD
                    </a>
                    <a
                        href="https://github.com/wallyatkins/WallyMud"
                        target="_blank"
                        rel="noreferrer"
                        className="games-btn games-btn-secondary"
                    >
                        View Web MUD Engine
                    </a>
                </div>
            </section>
        </div>
    );
};
