import React from 'react';

interface AboutProps {
    isArtMode: boolean;
    toggleArtMode: (e: React.MouseEvent) => void;
}

export const About: React.FC<AboutProps> = ({ isArtMode, toggleArtMode }) => {
    return (
        <section id="about" className="content-section">
            <h2 className="section-title">About Me</h2>
            <div className="about-grid">
                <div className="about-text">
                    <p className="lead">I am a Catalyst—using creativity, logic, and technology to empower others.</p>
                    <p>My roots are in the creative arts—starting as an art major with a passion for drawing. I blend
                        this artistic foundation with a rigorous analytical mind, honed through a
                        lifelong dedication to athletics (pole vault, volleyball, basketball, soccer, & more) and
                        statistical analysis.</p>
                    <p>I believe in "teaching a man to fish." My mission is to leverage technology not just for
                        efficiency, but to empower others to build, create, and improve. Guided by my Christian faith, I
                        view my work as a way to serve and move society forward.</p>
                </div>
                <div className="about-stats">
                    <div className="stat-item">
                        <h3>Identity</h3>
                        <p>The Catalyst</p>
                    </div>
                    <div className="stat-item">
                        <h3>Foundation</h3>
                        <p>
                            <span
                                id="theme-trigger"
                                style={{ display: 'inline-block', userSelect: 'none' }}
                                onDoubleClick={toggleArtMode}
                                className={isArtMode ? 'flip-horizontal' : ''}
                            >
                                {isArtMode ? "Art & Logic" : "Logic & Art"}
                            </span>
                        </p>
                    </div>
                    <div className="stat-item">
                        <h3>Faith</h3>
                        <p>Christian</p>
                    </div>
                </div>
            </div>
        </section>
    );
};
