import React, { createContext, useContext, useState } from 'react';

interface EasterEggContextType {
    isZoltarActive: boolean;
    activateZoltar: () => void;
    closeZoltar: () => void;
    isDPadActive: boolean;
    activateDPad: () => void;
    closeDPad: () => void;
    isGameUnlocked: boolean;
    activeGame: 'NONE' | 'SELECT' | 'BLOCK_BLAST' | 'SNAKE' | 'GEOMETRY_DASH';
    unlockGame: () => void;
    selectGame: (game: 'BLOCK_BLAST' | 'SNAKE' | 'GEOMETRY_DASH') => void;
    closeGame: () => void;
    returnToMenu: () => void;
    isFhqwhgadsActive: boolean;
    activateFhqwhgads: () => void;
    closeFhqwhgads: () => void;
}

const EasterEggContext = createContext<EasterEggContextType | undefined>(undefined);

export const EasterEggProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isZoltarActive, setIsZoltarActive] = useState(false);
    const [isDPadActive, setIsDPadActive] = useState(false);
    const [isGameUnlocked, setIsGameUnlocked] = useState(false);
    const [activeGame, setActiveGame] = useState<'NONE' | 'SELECT' | 'BLOCK_BLAST' | 'SNAKE' | 'GEOMETRY_DASH'>('NONE');
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

    const selectGame = (game: 'BLOCK_BLAST' | 'SNAKE' | 'GEOMETRY_DASH') => {
        setActiveGame(game);
    };

    const closeGame = () => {
        setIsGameUnlocked(false);
        setActiveGame('NONE');
    };

    const returnToMenu = () => {
        setActiveGame('SELECT');
    };

    const activateFhqwhgads = () => setIsFhqwhgadsActive(true);
    const closeFhqwhgads = () => setIsFhqwhgadsActive(false);

    return (
        <EasterEggContext.Provider value={{
            isZoltarActive, activateZoltar, closeZoltar,
            isDPadActive, activateDPad, closeDPad,
            isGameUnlocked, activeGame, unlockGame, selectGame, closeGame, returnToMenu,
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
