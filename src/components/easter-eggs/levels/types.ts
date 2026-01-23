export type ObstacleType = 'spike' | 'block' | 'platform' | 'portal' | 'finish';

export interface LevelObstacle {
    type: ObstacleType;
    x: number;
    y?: number; // If undefined, assumed to be on ground
    w: number;
    h: number;
    portalType?: 'CUBE' | 'SHIP';
}

export interface LevelData {
    id: number;
    speed: number;
    length: number;
    color: string;
    obstacles: LevelObstacle[];
}
