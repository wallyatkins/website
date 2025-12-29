import { useState, useEffect } from 'react';

export const useSecretCode = (secretCode: string) => {
    const [success, setSuccess] = useState(false);
    const [, setInput] = useState('');

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const key = e.key.toLowerCase();
            // Ensure we only track single characters
            if (key.length !== 1) return;

            setInput((prev) => {
                const nextInput = (prev + key).slice(-secretCode.length);

                if (nextInput === secretCode.toLowerCase()) {
                    setSuccess(true);
                }

                return nextInput;
            });
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [secretCode]);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                setSuccess(false);
                setInput('');
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [success]);

    return success;
};
