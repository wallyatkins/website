import React, { createContext, useContext, useState } from 'react';

interface EasterEggContextType {
    isZoltarActive: boolean;
    activateZoltar: () => void;
    closeZoltar: () => void;
    isDPadActive: boolean;
    activateDPad: () => void;
    closeDPad: () => void;
    isGameUnlocked: boolean;
    unlockGame: () => void;
    closeGame: () => void;
}

const EasterEggContext = createContext<EasterEggContextType | undefined>(undefined);

export const EasterEggProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isZoltarActive, setIsZoltarActive] = useState(false);
    const [isDPadActive, setIsDPadActive] = useState(false);
    const [isGameUnlocked, setIsGameUnlocked] = useState(false);

    const activateZoltar = () => setIsZoltarActive(true);
    const closeZoltar = () => setIsZoltarActive(false);

    const activateDPad = () => setIsDPadActive(true);
    const closeDPad = () => setIsDPadActive(false);

    const unlockGame = () => {
        setIsDPadActive(false);
        setIsGameUnlocked(true);
    };
    const closeGame = () => setIsGameUnlocked(false);

    return (
        <EasterEggContext.Provider value={{
            isZoltarActive, activateZoltar, closeZoltar,
            isDPadActive, activateDPad, closeDPad,
            isGameUnlocked, unlockGame, closeGame
        }}>
            {children}
        </EasterEggContext.Provider>
    );
};

export const useEasterEgg = () => {
    const context = useContext(EasterEggContext);
    if (!context) throw new Error('useEasterEgg must be used within EasterEggProvider');
    return context;
};
