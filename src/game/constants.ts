import type { LeaderboardEntry, MathTier, QualityTier, WeaponId, WeaponSpec } from './types';

export const WORLD_WIDTH = 1200;
export const WORLD_HEIGHT = 640;
export const GRAVITY = 420; // px / s^2 in logical world coords

export const WEAPONS: Record<WeaponId, WeaponSpec> = {
  standard: {
    id: 'standard',
    name: 'AP Shell',
    shortRole: 'Direct · 38 DMG',
    baseDamage: 38,
    blastRadius: 46,
    projectiles: 1,
    spreadDeg: 0,
    unlockStreak: 0,
    color: '#F59E0B',
  },
  cluster: {
    id: 'cluster',
    name: 'Tri-Volley',
    shortRole: '3-Spread · 22×3 DMG',
    baseDamage: 22,
    blastRadius: 34,
    projectiles: 3,
    spreadDeg: 5.5,
    unlockStreak: 2,
    color: '#EC4899',
  },
  mortar: {
    id: 'mortar',
    name: 'Nova Mortar',
    shortRole: 'Heavy · 62 DMG',
    baseDamage: 62,
    blastRadius: 68,
    projectiles: 1,
    spreadDeg: 0,
    unlockStreak: 4,
    color: '#8B5CF6',
  },
};

export interface TutorialStageConfig {
  wave: number;
  title: string;
  coachmark: string;
  tier: MathTier;
  windRange: [number, number];
  enemyArchetypes: Array<'scout' | 'mortar' | 'boss'>;
  enemyHp: number;
  unlockedWeapons: WeaponId[];
  arcPoints: number;
}

export const TUTORIAL_STAGES: TutorialStageConfig[] = [
  {
    wave: 1,
    title: 'Stage 1 · Basic Aim & Arithmetic',
    coachmark: 'Drag on the battlefield (or use Angle/Power buttons) to aim the dotted arc at the red Scout Tank, then tap the correct math answer to fire!',
    tier: 1,
    windRange: [0, 0],
    enemyArchetypes: ['scout'],
    enemyHp: 60,
    unlockedWeapons: ['standard'],
    arcPoints: 26,
  },
  {
    wave: 2,
    title: 'Stage 2 · Wind & Multiplication',
    coachmark: 'Watch the Wind Gauge at the top! Wind pushes shells mid-air. Solve multiplication & division equations to lock your targeting computer.',
    tier: 2,
    windRange: [35, 55],
    enemyArchetypes: ['scout'],
    enemyHp: 75,
    unlockedWeapons: ['standard'],
    arcPoints: 20,
  },
  {
    wave: 3,
    title: 'Stage 3 · Tri-Volley & PEMDAS',
    coachmark: 'Tri-Volley unlocked! Switch shells below to rain 3 shots over hills. Solve order-of-operations problems (multiply before adding).',
    tier: 3,
    windRange: [-65, 65],
    enemyArchetypes: ['scout', 'mortar'],
    enemyHp: 80,
    unlockedWeapons: ['standard', 'cluster'],
    arcPoints: 16,
  },
  {
    wave: 4,
    title: 'Stage 4 · Boss Duel & Algebra',
    coachmark: 'Final Training Boss! Nova Mortar is armed. Solve for x to fire full-damage artillery strikes and defeat the Armored Boss Tank!',
    tier: 4,
    windRange: [-85, 85],
    enemyArchetypes: ['boss'],
    enemyHp: 135,
    unlockedWeapons: ['standard', 'cluster', 'mortar'],
    arcPoints: 14,
  },
];

export interface QualityPreset {
  id: QualityTier;
  label: string;
  description: string;
  maxDpr: number;
  maxParticles: number;
  cloudsCount: number;
  showMountains: boolean;
  showTrails: boolean;
  parallaxDepth: 1 | 2 | 3;
  showWindStreaks: boolean;
}

export const QUALITY_PRESETS: Record<QualityTier, QualityPreset> = {
  eco: {
    id: 'eco',
    label: 'Eco (Low-Spec)',
    description: '1x resolution, light effects, 60fps on older phones',
    maxDpr: 1,
    maxParticles: 16,
    cloudsCount: 2,
    showMountains: false,
    showTrails: false,
    parallaxDepth: 1,
    showWindStreaks: false,
  },
  balanced: {
    id: 'balanced',
    label: 'Standard',
    description: '1.5x crisp vector graphics and smooth parallax depth',
    maxDpr: 1.5,
    maxParticles: 36,
    cloudsCount: 4,
    showMountains: true,
    showTrails: true,
    parallaxDepth: 2,
    showWindStreaks: true,
  },
  high: {
    id: 'high',
    label: 'Ultra Vector',
    description: 'Full 2x retina crispness, multi-plane parallax & wind streaks',
    maxDpr: 2,
    maxParticles: 72,
    cloudsCount: 6,
    showMountains: true,
    showTrails: true,
    parallaxDepth: 3,
    showWindStreaks: true,
  },
};

export const SEED_LEADERBOARD: LeaderboardEntry[] = [
  {
    userId: 'seed-euler',
    displayName: 'Commander Euler',
    bestScore: 4850,
    highestTier: 5,
    accuracyPct: 96,
    bestStreak: 14,
    totalSolved: 142,
    gamesPlayed: 12,
    updatedAtMs: 1763000000000,
    isSeed: true,
  },
  {
    userId: 'seed-noether',
    displayName: 'Major Noether',
    bestScore: 4120,
    highestTier: 5,
    accuracyPct: 93,
    bestStreak: 11,
    totalSolved: 118,
    gamesPlayed: 9,
    updatedAtMs: 1762900000000,
    isSeed: true,
  },
  {
    userId: 'seed-gauss',
    displayName: 'Captain Gauss',
    bestScore: 3490,
    highestTier: 4,
    accuracyPct: 90,
    bestStreak: 9,
    totalSolved: 96,
    gamesPlayed: 8,
    updatedAtMs: 1762800000000,
    isSeed: true,
  },
  {
    userId: 'seed-lovelace',
    displayName: 'Lt. Lovelace',
    bestScore: 2740,
    highestTier: 4,
    accuracyPct: 88,
    bestStreak: 7,
    totalSolved: 74,
    gamesPlayed: 6,
    updatedAtMs: 1762700000000,
    isSeed: true,
  },
  {
    userId: 'seed-ramanujan',
    displayName: 'Sgt. Ramanujan',
    bestScore: 1980,
    highestTier: 3,
    accuracyPct: 85,
    bestStreak: 6,
    totalSolved: 52,
    gamesPlayed: 5,
    updatedAtMs: 1762600000000,
    isSeed: true,
  },
];
