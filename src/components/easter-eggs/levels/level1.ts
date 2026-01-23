import type { LevelData, LevelObstacle } from './types';

const BLOCK_SIZE = 30;
const GROUND_Y = 350; // Canvas height 400 - 50 ground

const obstacles: LevelObstacle[] = [];

// Helper to add ground spike
const addSpike = (x: number) => {
    obstacles.push({
        type: 'spike',
        x,
        y: GROUND_Y - BLOCK_SIZE,
        w: BLOCK_SIZE,
        h: BLOCK_SIZE
    });
};

// Helper to add ground block
const addBlock = (x: number) => {
    obstacles.push({
        type: 'block',
        x,
        y: GROUND_Y - BLOCK_SIZE,
        w: BLOCK_SIZE,
        h: BLOCK_SIZE
    });
};

// Helper to add platform
const addPlatform = (x: number, height: number, width: number = 3) => {
    obstacles.push({
        type: 'platform',
        x,
        y: GROUND_Y - height * BLOCK_SIZE,
        w: width * BLOCK_SIZE,
        h: BLOCK_SIZE
    });
};

// --- Level Design ---
// Start with some easy jumps
let cx = 800; // Start after screen width

for (let i = 0; i < 5; i++) {
    cx += 400;
    addSpike(cx);
}

// Double spikes
for (let i = 0; i < 5; i++) {
    cx += 500;
    addSpike(cx);
    addSpike(cx + BLOCK_SIZE);
}

// Triple spikes (Hard!)
cx += 600;
addSpike(cx);
addSpike(cx + BLOCK_SIZE);
addSpike(cx + BLOCK_SIZE * 2);

// Platform section
cx += 800;
addBlock(cx);
addBlock(cx + BLOCK_SIZE); // Jump base
addPlatform(cx + 300, 3); // Low platform
addPlatform(cx + 600, 5); // High platform
addPlatform(cx + 900, 3); // Low platform
addSpike(cx + 900 + BLOCK_SIZE); // Spike on platform? No, spike under?
addSpike(cx + 1200); // Ground spike landing

// Ship Mode Portal
cx += 1000;
obstacles.push({
    type: 'portal',
    portalType: 'SHIP',
    x: cx,
    y: GROUND_Y - 150,
    w: 60,
    h: 160
});

// Ship Section (Flying)
cx += 500;
// Ceiling blocks / floor spikes
for (let i = 0; i < 20; i++) {
    cx += 400;
    if (i % 2 === 0) {
        // Floor spike
        addSpike(cx);
    } else {
        // Ceiling block (hanging)
        obstacles.push({
            type: 'block',
            x: cx,
            y: 50,
            w: BLOCK_SIZE,
            h: BLOCK_SIZE * 3
        });
    }
}

// Back to Cube
cx += 500;
obstacles.push({
    type: 'portal',
    portalType: 'CUBE',
    x: cx,
    y: GROUND_Y - 150,
    w: 60,
    h: 160
});

// Final cool down
cx += 500;
addSpike(cx);
cx += 300;
addSpike(cx);

export const level1: LevelData = {
    id: 1,
    speed: 6,
    length: cx + 1000,
    color: '#00f3ff',
    obstacles
};
