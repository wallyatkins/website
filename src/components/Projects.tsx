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
            <h2 className="section-title">Open Source Projects</h2>
            <div className="project-list">
                <div className="project-item">
                    <span className="project-category">Web Service</span>
                    <div className="project-info">
                        <h3 className="project-name">Story Prompts</h3>
                        <p className="project-desc">A video-sharing service for 1-on-1 storytelling. Designed to foster
                            controlled, meaningful interactions rather than broad social networking.</p>
                    </div>
                    <a href="https://github.com/wallyatkins" target="_blank" rel="noreferrer" className="project-link">GitHub</a>
                </div>
                <div className="project-item">
                    <span className="project-category">AI Workflow</span>
                    <div className="project-info">
                        <h3
                            className="project-name"
                            onMouseMove={handleRub}
                            onTouchMove={handleRub}
                        >
                            Zoltar
                        </h3>
                        <p className="project-desc">An agentic "magic genie" workflow. It leverages AI and complex
                            automation to grant user "wishes" and execute tasks.</p>
                    </div>
                    <a href="https://github.com/wallyatkins" target="_blank" rel="noreferrer" className="project-link">GitHub</a>
                </div>
                <div className="project-item">
                    <span className="project-category">Games</span>
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
                                Games
                            </a>
                        </h3>
                        <p className="project-desc">From 1991 Unix dial-up sessions to modern Java engines and mobile-first web MUDs. A lifelong journey through virtual worlds.</p>
                    </div>
                    <a href="https://github.com/wallyatkins/java-merc-mud" target="_blank" rel="noreferrer" className="project-link">GitHub</a>
                </div>
                <div className="project-item">
                    <span className="project-category">Analytics</span>
                    <div className="project-info">
                        <h3 className="project-name">Sports Analysis</h3>
                        <p className="project-desc">Developing improved statistical methodologies for athletic performance.
                        </p>
                    </div>
                    <a href="https://github.com/wallyatkins" target="_blank" rel="noreferrer" className="project-link">GitHub</a>
                </div>
            </div>
        </section>
    );
};
