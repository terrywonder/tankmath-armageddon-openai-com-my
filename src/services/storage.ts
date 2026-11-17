import { SEED_LEADERBOARD } from '../game/constants';
import {
  createDefaultWeaponUpgrades,
  normalizeWeaponUpgrades,
} from '../game/upgrades';
import type {
  LeaderboardEntry,
  PlayerSaveData,
  QualityTier,
  RunStats,
  WeaponUpgradesMap,
} from '../game/types';

const SAVE_KEY = 'tankmath_save_v1';
const PENDING_SYNC_KEY = 'tankmath_pending_sync_v1';
const LEADERBOARD_CACHE_KEY = 'tankmath_leaderboard_cache_v1';

export function detectOptimalQualityTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'balanced';
  if (navigator.webdriver) return 'eco';
  const cores = navigator.hardwareConcurrency || 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
  if (cores <= 2 || mem <= 2) return 'eco';
  if (cores <= 4 || mem <= 4) return 'balanced';
  return 'high';
}

export function detectDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Web Browser';
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|android.*mobile|mobile/.test(ua)) return 'Mobile Device';
  if (/ipad|tablet|android(?!.*mobile)/.test(ua)) return 'Tablet Device';
  return 'Desktop Browser';
}

export function createDefaultSave(): PlayerSaveData {
  return {
    displayName: 'Cadet',
    totalXp: 0,
    credits: 80,
    unlockedStage: 1,
    tutorialCompleted: false,
    bestScore: 0,
    bestStreak: 0,
    totalSolved: 0,
    totalAttempted: 0,
    gamesPlayed: 0,
    preferredSpec: detectOptimalQualityTier(),
    soundEnabled: true,
    tankColor: '#2563EB',
    unlockedWeapons: ['standard'],
    weaponUpgrades: createDefaultWeaponUpgrades(),
    lastSyncedDevice: detectDeviceLabel(),
    updatedAtMs: Date.now(),
  };
}

export function loadLocalSave(): PlayerSaveData {
  if (typeof localStorage === 'undefined') return createDefaultSave();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return createDefaultSave();
    const parsed = JSON.parse(raw) as Partial<PlayerSaveData>;
    const defaults = createDefaultSave();
    return {
      ...defaults,
      ...parsed,
      credits:
        typeof parsed.credits === 'number' && Number.isFinite(parsed.credits)
          ? Math.max(0, Math.round(parsed.credits))
          : defaults.credits,
      unlockedWeapons:
        Array.isArray(parsed.unlockedWeapons) && parsed.unlockedWeapons.length > 0
          ? parsed.unlockedWeapons
          : ['standard'],
      weaponUpgrades: normalizeWeaponUpgrades(parsed.weaponUpgrades),
    };
  } catch {
    return createDefaultSave();
  }
}

export function writeLocalSave(save: PlayerSaveData): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Storage quota exceeded - ignore silently
  }
}

function mergeWeaponUpgrades(a: WeaponUpgradesMap, b: WeaponUpgradesMap): WeaponUpgradesMap {
  const na = normalizeWeaponUpgrades(a);
  const nb = normalizeWeaponUpgrades(b);
  return {
    standard: {
      damageLevel: Math.max(na.standard.damageLevel, nb.standard.damageLevel),
      radiusLevel: Math.max(na.standard.radiusLevel, nb.standard.radiusLevel),
      shellsLevel: Math.max(na.standard.shellsLevel, nb.standard.shellsLevel),
    },
    cluster: {
      damageLevel: Math.max(na.cluster.damageLevel, nb.cluster.damageLevel),
      radiusLevel: Math.max(na.cluster.radiusLevel, nb.cluster.radiusLevel),
      shellsLevel: Math.max(na.cluster.shellsLevel, nb.cluster.shellsLevel),
    },
    mortar: {
      damageLevel: Math.max(na.mortar.damageLevel, nb.mortar.damageLevel),
      radiusLevel: Math.max(na.mortar.radiusLevel, nb.mortar.radiusLevel),
      shellsLevel: Math.max(na.mortar.shellsLevel, nb.mortar.shellsLevel),
    },
  };
}

export function mergeSaves(local: PlayerSaveData, cloud: PlayerSaveData): PlayerSaveData {
  const weapons = Array.from(
    new Set([...local.unlockedWeapons, ...cloud.unlockedWeapons])
  ).slice(0, 3);

  const localNewer = local.updatedAtMs >= cloud.updatedAtMs;
  return {
    displayName: localNewer ? local.displayName : cloud.displayName,
    totalXp: Math.max(local.totalXp, cloud.totalXp),
    credits: localNewer ? local.credits : cloud.credits,
    unlockedStage: Math.max(local.unlockedStage, cloud.unlockedStage),
    tutorialCompleted: local.tutorialCompleted || cloud.tutorialCompleted,
    bestScore: Math.max(local.bestScore, cloud.bestScore),
    bestStreak: Math.max(local.bestStreak, cloud.bestStreak),
    totalSolved: Math.max(local.totalSolved, cloud.totalSolved),
    totalAttempted: Math.max(local.totalAttempted, cloud.totalAttempted),
    gamesPlayed: Math.max(local.gamesPlayed, cloud.gamesPlayed),
    preferredSpec: local.preferredSpec,
    soundEnabled: local.soundEnabled,
    tankColor: localNewer ? local.tankColor : cloud.tankColor,
    unlockedWeapons: weapons.length > 0 ? weapons : ['standard'],
    weaponUpgrades: mergeWeaponUpgrades(local.weaponUpgrades, cloud.weaponUpgrades),
    lastSyncedDevice: detectDeviceLabel(),
    updatedAtMs: Date.now(),
  };
}

export function applyRunStatsToSave(prev: PlayerSaveData, stats: RunStats): PlayerSaveData {
  const weapons = new Set(prev.unlockedWeapons);
  if (stats.bestStreak >= 2 || (stats.mode === 'tutorial' && stats.waveReached >= 3)) {
    weapons.add('cluster');
  }
  if (stats.bestStreak >= 4 || (stats.mode === 'tutorial' && stats.waveReached >= 4)) {
    weapons.add('mortar');
  }

  return {
    ...prev,
    totalXp: prev.totalXp + stats.score,
    credits: prev.credits + stats.creditsEarned,
    unlockedStage:
      stats.mode === 'tutorial' && stats.victory
        ? Math.max(prev.unlockedStage, 4)
        : Math.max(prev.unlockedStage, stats.waveReached),
    tutorialCompleted: prev.tutorialCompleted || (stats.mode === 'tutorial' && stats.victory),
    bestScore: Math.max(prev.bestScore, stats.score),
    bestStreak: Math.max(prev.bestStreak, stats.bestStreak),
    totalSolved: prev.totalSolved + stats.correctCount,
    totalAttempted: prev.totalAttempted + stats.attemptCount,
    gamesPlayed: prev.gamesPlayed + 1,
    unlockedWeapons: Array.from(weapons),
    weaponUpgrades: normalizeWeaponUpgrades(prev.weaponUpgrades),
    lastSyncedDevice: detectDeviceLabel(),
    updatedAtMs: Date.now(),
  };
}

export function markPendingSync(pending: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (pending) {
      localStorage.setItem(PENDING_SYNC_KEY, String(Date.now()));
    } else {
      localStorage.removeItem(PENDING_SYNC_KEY);
    }
  } catch {
    // ignore
  }
}

export function hasPendingSync(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return Boolean(localStorage.getItem(PENDING_SYNC_KEY));
}

export function loadCachedLeaderboard(): LeaderboardEntry[] {
  if (typeof localStorage === 'undefined') return SEED_LEADERBOARD;
  try {
    const raw = localStorage.getItem(LEADERBOARD_CACHE_KEY);
    if (!raw) return SEED_LEADERBOARD;
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED_LEADERBOARD;
  } catch {
    return SEED_LEADERBOARD;
  }
}

export function cacheLeaderboard(entries: LeaderboardEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LEADERBOARD_CACHE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}
