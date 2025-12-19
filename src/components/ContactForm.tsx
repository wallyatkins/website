import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ChatInterface } from './ChatInterface';

export const ContactForm: React.FC = () => {
    const { register, handleSubmit, reset } = useForm();
    const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | '' }>({ message: '', type: '' });
    const [isSending, setIsSending] = useState(false);
    const [showEnvelope, setShowEnvelope] = useState(false);
    const [envelopeState, setEnvelopeState] = useState(''); // closed, animate-slide-out
    const formLoadTime = React.useRef(Math.floor(Date.now() / 1000).toString());

    // Chat State
    const [activeChat, setActiveChat] = useState<{ chatId: string, token: string } | null>(null);

    const onSubmit = async (data: any) => {
        setIsSending(true);
        setStatus({ message: '', type: '' });

        const formData = new FormData();
        Object.keys(data).forEach(key => formData.append(key, data[key]));
        formData.append('form_timestamp', formLoadTime.current);

        try {
            const response = await fetch('pine.php', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();

            // Check for Chat Start
            if (response.ok && result.status === 'chat_start') {
                // Add a small delay/animation before switching?
                // For now, immediate switch, but the Component swap acts as transition.
                setActiveChat({
                    chatId: result.chat_id,
                    token: result.user_token
                });
                return; // Stop normal envelope animation
            }

            if (response.ok && result.status === 'success') {
                setShowEnvelope(true);

                // Animation Sequence
                setTimeout(() => {
                    setEnvelopeState('closed');
                    setTimeout(() => {
                        setEnvelopeState('closed animate-seal'); // Add seal
                        setTimeout(() => {
                            setEnvelopeState('closed animate-seal animate-slide-out'); // Slide out
                            setTimeout(() => {
                                setShowEnvelope(false);
                                setEnvelopeState('');
                                reset();
                                setStatus({ message: 'Message Sent! ✉️', type: 'success' });
                            }, 1000);
                        }, 1000);
                    }, 600);
                }, 100);

            } else {
                throw new Error(result.message || 'Something went wrong');
            }
        } catch (error: any) {
            setStatus({ message: error.message, type: 'error' });
        } finally {
            setIsSending(false);
        }
    };

    if (activeChat) {
        return (
            <section id="contact" className="content-section">
                <h2 className="section-title">Live Chat</h2>
                <div className="contact-container" style={{ minHeight: '500px' }}>
                    <ChatInterface chatId={activeChat.chatId} token={activeChat.token} onClose={() => setActiveChat(null)} />
                </div>
            </section>
        );
    }

    return (
        <section id="contact" className="content-section">
            <h2 className="section-title">Get in Touch</h2>
            <div className="contact-container">
                <div className={showEnvelope ? 'hidden' : ''}>
                    <form id="contact-form" className="contact-form" onSubmit={handleSubmit(onSubmit)}>
                        <input type="text" {...register('website_url')} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

                        <div className="form-group">
                            <label htmlFor="name">Name</label>
                            <input type="text" id="name" {...register('name', { required: true })} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input type="email" id="email" {...register('email', { required: true })} />
                        </div>
                        <div className="form-group">
                            <label htmlFor="message">Message</label>
                            <textarea id="message" rows={5} {...register('message', { required: true })}></textarea>
                        </div>

                        <button type="submit" className="submit-btn" disabled={isSending}>
                            {isSending ? 'Sending...' : 'Send Message'}
                        </button>
                        <div className={`form-status ${status.type}`}>{status.message}</div>
                    </form>
                </div>

                <div id="envelope-container" className={`envelope-container ${showEnvelope ? 'active ' + envelopeState : 'hidden'}`}>
                    <div className={`envelope ${envelopeState.includes('closed') ? 'closed' : ''}`}>
                        <div className="envelope-flap"></div>
                        <div className="envelope-pocket"></div>
                        <div className={`wax-seal ${envelopeState.includes('animate-seal') ? 'animate-seal' : ''}`}>
                            <span className="seal-text">WA</span>
                        </div>
                    </div>
                </div>

                <div className="social-links">
                    <a href="https://github.com/wallyatkins" target="_blank" aria-label="GitHub"><i className="fab fa-github"></i> GitHub</a>
                    <a href="https://linkedin.com/in/wallyatkins" target="_blank" aria-label="LinkedIn"><i className="fab fa-linkedin"></i> LinkedIn</a>
                    <a href="https://instagram.com/wallyatkins" target="_blank" aria-label="Instagram"><i className="fab fa-instagram"></i> Instagram</a>
                    <a href="https://facebook.com/wallyatkins" target="_blank" aria-label="Facebook"><i className="fab fa-facebook"></i> Facebook</a>
                </div>
            </div>
        </section>
    );
};
