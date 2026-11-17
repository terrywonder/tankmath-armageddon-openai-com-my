export type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'tutorial' | 'skirmish' | 'endless';

export type QualityTier = 'eco' | 'balanced' | 'high';

export type MathTier = 1 | 2 | 3 | 4 | 5;

export type WeaponId = 'standard' | 'cluster' | 'mortar';

export interface WeaponSpec {
  id: WeaponId;
  name: string;
  shortRole: string;
  baseDamage: number;
  blastRadius: number;
  projectiles: number;
  spreadDeg: number;
  unlockStreak: number;
  color: string;
}

export interface MathQuestion {
  id: string;
  tier: MathTier;
  topic: string;
  prompt: string;
  hint: string;
  correctAnswer: number;
  choices: number[];
  explanation: string;
}

export type EnemyArchetype = 'scout' | 'mortar' | 'boss';

export interface TankEntity {
  id: string;
  name: string;
  isPlayer: boolean;
  archetype?: EnemyArchetype;
  x: number;
  y: number;
  vx: number;
  angleDeg: number; // 0 = right, 90 = up, 180 = left
  power: number; // 20..100
  hp: number;
  maxHp: number;
  shield: number;
  color: string;
  accentColor: string;
  hitFlashTimer: number;
  koTimer: number; // >0 while playing topple/dissolve KO animation
  isAlive: boolean;
  facing: 1 | -1;
}

export interface ProjectileEntity {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  blastRadius: number;
  color: string;
  fromPlayer: boolean;
  isAccurate: boolean;
  trailTimer: number;
}

export interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export type UpgradeStatKey = 'damageLevel' | 'radiusLevel' | 'shellsLevel';

export interface WeaponUpgradeLevels {
  damageLevel: number;
  radiusLevel: number;
  shellsLevel: number;
}

export type WeaponUpgradesMap = Record<WeaponId, WeaponUpgradeLevels>;

export interface RunStats {
  mode: GameMode;
  victory: boolean;
  score: number;
  creditsEarned: number;
  waveReached: number;
  highestTier: MathTier;
  correctCount: number;
  attemptCount: number;
  bestStreak: number;
  directHits: number;
  enemiesDefeated: number;
  durationSec: number;
}

export interface PlayerSaveData {
  displayName: string;
  totalXp: number;
  credits: number;
  unlockedStage: number;
  tutorialCompleted: boolean;
  bestScore: number;
  bestStreak: number;
  totalSolved: number;
  totalAttempted: number;
  gamesPlayed: number;
  preferredSpec: QualityTier;
  soundEnabled: boolean;
  tankColor: string;
  unlockedWeapons: WeaponId[];
  weaponUpgrades: WeaponUpgradesMap;
  lastSyncedDevice: string;
  updatedAtMs: number;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  bestScore: number;
  highestTier: number;
  accuracyPct: number;
  bestStreak: number;
  totalSolved: number;
  gamesPlayed: number;
  updatedAtMs: number;
  isSeed?: boolean;
}
