import React, { useState, useEffect, useRef } from 'react';

interface IRCInterfaceProps {
    ircId: string;
    token: string;
    onClose?: () => void;
}

interface Message {
    sender: 'user' | 'admin' | 'system';
    text: string;
    time: number;
}

type IRCState = 'waiting' | 'active' | 'ended';

export const IRCInterface: React.FC<IRCInterfaceProps> = ({ ircId, token, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [ircState, setIRCState] = useState<IRCState>('waiting');
    const [guestName, setGuestName] = useState('');
    const [error, setError] = useState('');
    const [countdown, setCountdown] = useState(200);
    const [hasResent, setHasResent] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const searchParams = new URLSearchParams(window.location.search);
    const isFullscreenUrl = !!searchParams.get('irc_id');
    const isGuestParam = searchParams.get('role') === 'guest';
    const isHost = isFullscreenUrl && !isGuestParam; // Host if fullscreen AND not explicitly guest

    // If Admin opens link, they are immediately active
    useEffect(() => {
        if (isHost) setIRCState('active');
    }, [isHost]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const pollMessages = async () => {
        try {
            const response = await fetch(`irc.php?action=poll&irc_id=${ircId}&token=${token}`);
            if (!response.ok) {
                if (response.status === 404) {
                    setError('IRC session ended.');
                    setIRCState('ended');
                    return;
                }
                throw new Error('Network error');
            }
            const data = await response.json();
            if (data.status === 'success') {
                setMessages(data.messages);
                if (data.guest_name) setGuestName(data.guest_name);

                // Check for Connection (only for Guest)
                if (!isHost && ircState === 'waiting' && data.other_online) {
                    setIRCState('active');
                }
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    };

    useEffect(() => {
        pollMessages();
        const interval = setInterval(pollMessages, 2000);
        return () => clearInterval(interval);
    }, [ircId, token, ircState, isHost]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, ircState]);

    // Countdown Logic (only for Guest in Waiting state)
    useEffect(() => {
        if (isHost || ircState !== 'waiting') return;

        const timer = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [ircState, isHost]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        try {
            const formData = new FormData();
            formData.append('message', inputText);

            await fetch(`irc.php?action=send&irc_id=${ircId}&token=${token}`, {
                method: 'POST',
                body: formData
            });
            setInputText('');
            pollMessages(); // Instant update
        } catch (e) {
            console.error("Send error", e);
        }
    };

    const endIRC = async () => {
        if (confirm("Are you sure you want to end this IRC session?")) {
            await fetch(`irc.php?action=end&irc_id=${ircId}&token=${token}`);
            if (onClose) onClose();
            else window.location.href = '/';
        }
    };

    const onTryAgain = async () => {
        setHasResent(true);
        setCountdown(200); // Reset timer
        // Call Backend to resend email
        await fetch(`irc.php?action=resend_invite&irc_id=${ircId}&token=${token}`);
    };

    // --- RENDER ---

    if (error) {
        return (
            <div className="chat-interface full-screen-chat error-state">
                <p>{error}</p>
                <button onClick={() => window.location.href = '/'} className="chat-btn">Return Home</button>
            </div>
        );
    }

    return (
        <div className="chat-interface full-screen-chat">
            <div className="chat-header">
                <div className="chat-status">
                    <span className={`status-dot ${ircState === 'active' ? 'online' : 'orange'}`}></span>
                    <span className="chat-title-text">
                        {isHost ? `IRC with ${guestName || 'Guest'}` : (
                            ircState === 'active' ? "You are in IRC with Wally Atkins" : "Waiting for Wally to connect..."
                        )}
                    </span>
                </div>
                <button onClick={endIRC} className="chat-close-btn" title="End IRC">✕</button>
            </div>

            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-bubble ${msg.sender}`}>
                        <div className="bubble-content">{msg.text}</div>
                        <div className="bubble-time">
                            {new Date(msg.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                ))}

                {!isHost && ircState === 'waiting' && (
                    <div className="waiting-status-container">
                        <p>Waiting for Wally... ({Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')})</p>
                        {countdown === 0 && !hasResent && (
                            <div className="waiting-actions">
                                <p>Wally might be busy.</p>
                                <button onClick={onTryAgain} className="chat-btn primary">Try Again (Resend Invite)</button>
                            </div>
                        )}
                        {countdown === 0 && hasResent && (
                            <div className="waiting-actions">
                                <p>Still no response. Wally is likely unavailable.</p>
                                <button onClick={endIRC} className="chat-btn">Close IRC</button>
                            </div>
                        )}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={ircState === 'waiting' ? "Connecting..." : "Type a message..."}
                    disabled={ircState !== 'active'}
                    autoFocus
                />
                <button type="submit" disabled={!inputText.trim() || ircState !== 'active'}>Send</button>
            </form>
        </div>
    );
};
