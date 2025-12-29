import React, { createContext, useContext, useState } from 'react';

interface EasterEggContextType {
    isZoltarActive: boolean;
    activateZoltar: () => void;
    closeZoltar: () => void;
    isDPadActive: boolean;
    activateDPad: () => void;
    closeDPad: () => void;
    isGameUnlocked: boolean;
    activeGame: 'NONE' | 'SELECT' | 'BLOCK_BLAST' | 'SNAKE';
    unlockGame: () => void;
    selectGame: (game: 'BLOCK_BLAST' | 'SNAKE') => void;
    closeGame: () => void;
    isFhqwhgadsActive: boolean;
    activateFhqwhgads: () => void;
    closeFhqwhgads: () => void;
}

const EasterEggContext = createContext<EasterEggContextType | undefined>(undefined);

export const EasterEggProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isZoltarActive, setIsZoltarActive] = useState(false);
    const [isDPadActive, setIsDPadActive] = useState(false);
    const [isGameUnlocked, setIsGameUnlocked] = useState(false);
    const [activeGame, setActiveGame] = useState<'NONE' | 'SELECT' | 'BLOCK_BLAST' | 'SNAKE'>('NONE');
    const [isFhqwhgadsActive, setIsFhqwhgadsActive] = useState(false);

    const activateZoltar = () => setIsZoltarActive(true);
    const closeZoltar = () => setIsZoltarActive(false);

    const activateDPad = () => setIsDPadActive(true);
    const closeDPad = () => setIsDPadActive(false);

    const unlockGame = () => {
        setIsDPadActive(false);
        setIsGameUnlocked(true);
        setActiveGame('SELECT');
    };

    const selectGame = (game: 'BLOCK_BLAST' | 'SNAKE') => {
        setActiveGame(game);
    };

    const closeGame = () => {
        setIsGameUnlocked(false);
        setActiveGame('NONE');
    };

    const activateFhqwhgads = () => setIsFhqwhgadsActive(true);
    const closeFhqwhgads = () => setIsFhqwhgadsActive(false);

    return (
        <EasterEggContext.Provider value={{
            isZoltarActive, activateZoltar, closeZoltar,
            isDPadActive, activateDPad, closeDPad,
            isGameUnlocked, activeGame, unlockGame, selectGame, closeGame,
            isFhqwhgadsActive, activateFhqwhgads, closeFhqwhgads
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
