import type { LevelData, LevelObstacle } from './types';

const BLOCK_SIZE = 30;
const GROUND_Y = 350;

const obstacles: LevelObstacle[] = [];

const addSpike = (x: number) => {
    obstacles.push({
        type: 'spike',
        x,
        y: GROUND_Y - BLOCK_SIZE,
        w: BLOCK_SIZE,
        h: BLOCK_SIZE
    });
};

let cx = 800;

// Faster start
for (let i = 0; i < 10; i++) {
    cx += 350; // Closer jumps
    addSpike(cx);
}

// Ship start
cx += 600;
obstacles.push({
    type: 'portal',
    portalType: 'SHIP',
    x: cx,
    y: GROUND_Y - 150,
    w: 60,
    h: 160
});

cx += 500;
// Tunnel
for (let i = 0; i < 30; i++) {
    cx += 300;
    obstacles.push({
        type: 'block',
        x: cx,
        y: 0,
        w: BLOCK_SIZE,
        h: BLOCK_SIZE * 4 // Low ceiling
    });
    obstacles.push({
        type: 'block',
        x: cx,
        y: GROUND_Y - BLOCK_SIZE * 2,
        w: BLOCK_SIZE,
        h: BLOCK_SIZE * 2 // High floor
    });
}

obstacles.push({
    type: 'portal',
    portalType: 'CUBE',
    x: cx + 500,
    y: GROUND_Y - 150,
    w: 60,
    h: 160
});

export const level2: LevelData = {
    id: 2,
    speed: 8, // Faster
    length: cx + 2000,
    color: '#ff0055',
    obstacles
};
