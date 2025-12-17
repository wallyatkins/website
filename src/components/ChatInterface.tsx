import React, { useState, useEffect, useRef } from 'react';

interface ChatInterfaceProps {
    chatId: string;
    token: string;
    onClose?: () => void;
}

interface Message {
    sender: 'user' | 'admin' | 'system';
    text: string;
    time: number;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatId, token, onClose }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState('');
    const [otherOnline, setOtherOnline] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const pollMessages = async () => {
        try {
            const response = await fetch(`chat_api.php?action=poll&chat_id=${chatId}&token=${token}`);
            if (!response.ok) {
                if (response.status === 404) {
                    setError('Chat ended.');
                    return;
                }
                throw new Error('Network error');
            }
            const data = await response.json();
            if (data.status === 'success') {
                setMessages(data.messages);
                setOtherOnline(data.other_online);
            }
        } catch (e) {
            console.error("Polling error", e);
        }
    };

    useEffect(() => {
        pollMessages();
        const interval = setInterval(pollMessages, 2000);
        return () => clearInterval(interval);
    }, [chatId, token]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        try {
            const formData = new FormData();
            formData.append('message', inputText);

            await fetch(`chat_api.php?action=send&chat_id=${chatId}&token=${token}`, {
                method: 'POST',
                body: formData
            });
            setInputText('');
            pollMessages(); // Instant update
        } catch (e) {
            console.error("Send error", e);
        }
    };

    const endChat = async () => {
        if (confirm("Are you sure you want to end this chat?")) {
            await fetch(`chat_api.php?action=end&chat_id=${chatId}&token=${token}`);
            if (onClose) onClose();
            else window.location.href = '/';
        }
    };

    if (error) {
        return (
            <div className="chat-error-container">
                <p>{error}</p>
                <button onClick={() => window.location.href='/'} className="chat-btn">Return Home</button>
            </div>
        );
    }

    return (
        <div className="chat-interface">
            <div className="chat-header">
                <div className="chat-status">
                    <span className={`status-dot ${otherOnline ? 'online' : 'offline'}`}></span>
                    {otherOnline ? 'Other Person is Online' : 'Waiting for connection...'}
                </div>
                <button onClick={endChat} className="chat-close-btn" title="End Chat">✕</button>
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
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={sendMessage}>
                <input 
                    type="text" 
                    value={inputText} 
                    onChange={(e) => setInputText(e.target.value)} 
                    placeholder="Type a message..." 
                    autoFocus
                />
                <button type="submit" disabled={!inputText.trim()}>Send</button>
            </form>
        </div>
    );
};
