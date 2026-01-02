import React from 'react';
import { motion, type PanInfo } from 'framer-motion';

interface ThemeTriggerProps {
    isCreativeMode: boolean;
    onToggle: () => void;
}

export const ThemeTrigger: React.FC<ThemeTriggerProps> = ({ isCreativeMode, onToggle }) => {


    // We will render "Logic" and "Art" in an order dependent on `isCreativeMode`.
    // Actually, to simulate the "flying" effect, we should perhaps always render "Logic" and "Art" as distinct keys
    // and just change their flex order or position in array.

    const items = [
        { id: 'logic', text: 'Logic' },
        { id: 'art', text: 'Art' }
    ];

    // Current display order
    const displayItems = isCreativeMode
        ? [items[1], items[0]] // Art, Logic
        : [items[0], items[1]]; // Logic, Art

    return (
        <div className="theme-trigger-container" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', cursor: 'grab', touchAction: 'none' }}>
            {displayItems.map((item, index) => (
                <React.Fragment key={item.id}>
                    {index === 1 && <span className="ampersand">&</span>}
                    <motion.div
                        layout
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={0.2}
                        onDragEnd={(_, info: PanInfo) => {
                            const threshold = 30;
                            // If it's the left item dragging right
                            if (index === 0 && info.offset.x > threshold) {
                                onToggle();
                            }
                            // If it's the right item dragging left
                            if (index === 1 && info.offset.x < -threshold) {
                                onToggle();
                            }
                        }}
                        className={`trigger-word trigger-${item.id}`}
                        style={{
                            fontWeight: 'bold',
                            display: 'inline-block'
                        }}
                    >
                        {item.text}
                    </motion.div>
                </React.Fragment>
            ))}
        </div>
    );
};
