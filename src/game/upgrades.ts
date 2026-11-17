import { WEAPONS } from './constants';
import type {
  PlayerSaveData,
  RunStats,
  UpgradeStatKey,
  WeaponId,
  WeaponSpec,
  WeaponUpgradeLevels,
  WeaponUpgradesMap,
} from './types';

export const MAX_UPGRADE_LEVELS: Record<UpgradeStatKey, number> = {
  damageLevel: 3,
  radiusLevel: 3,
  shellsLevel: 2,
};

export const WEAPON_UNLOCK_COSTS: Record<WeaponId, number> = {
  standard: 0,
  cluster: 100,
  mortar: 180,
};

export function createDefaultWeaponUpgrades(): WeaponUpgradesMap {
  return {
    standard: { damageLevel: 0, radiusLevel: 0, shellsLevel: 0 },
    cluster: { damageLevel: 0, radiusLevel: 0, shellsLevel: 0 },
    mortar: { damageLevel: 0, radiusLevel: 0, shellsLevel: 0 },
  };
}

export function normalizeWeaponUpgrades(
  raw?: Partial<Record<WeaponId, Partial<WeaponUpgradeLevels>>>
): WeaponUpgradesMap {
  const base = createDefaultWeaponUpgrades();
  if (!raw || typeof raw !== 'object') return base;

  (['standard', 'cluster', 'mortar'] as WeaponId[]).forEach((id) => {
    const entry = raw[id];
    if (!entry || typeof entry !== 'object') return;
    base[id] = {
      damageLevel: clampLevel(entry.damageLevel, MAX_UPGRADE_LEVELS.damageLevel),
      radiusLevel: clampLevel(entry.radiusLevel, MAX_UPGRADE_LEVELS.radiusLevel),
      shellsLevel: clampLevel(entry.shellsLevel, MAX_UPGRADE_LEVELS.shellsLevel),
    };
  });

  return base;
}

function clampLevel(val: unknown, max: number): number {
  const n = Math.round(Number(val) || 0);
  return Math.max(0, Math.min(max, n));
}

export function getEffectiveWeaponSpec(
  weaponId: WeaponId,
  upgrades: WeaponUpgradesMap
): WeaponSpec {
  const base = WEAPONS[weaponId];
  const lvl = upgrades[weaponId] ?? { damageLevel: 0, radiusLevel: 0, shellsLevel: 0 };

  const dmgStep = weaponId === 'mortar' ? 14 : weaponId === 'cluster' ? 6 : 9;
  const radStep = weaponId === 'mortar' ? 12 : 9;

  const projectiles = base.projectiles + lvl.shellsLevel;
  const spreadDeg =
    projectiles <= 1
      ? 0
      : base.spreadDeg > 0
        ? base.spreadDeg
        : 4.5;

  const baseDamage = base.baseDamage + lvl.damageLevel * dmgStep;
  const blastRadius = base.blastRadius + lvl.radiusLevel * radStep;

  const shortRole =
    projectiles > 1
      ? `${projectiles}×${baseDamage} DMG · ${blastRadius}px`
      : `Direct · ${baseDamage} DMG · ${blastRadius}px`;

  return {
    ...base,
    baseDamage,
    blastRadius,
    projectiles,
    spreadDeg,
    shortRole,
  };
}

export function getUpgradeCost(
  weaponId: WeaponId,
  stat: UpgradeStatKey,
  currentLevel: number
): number {
  const weaponMult = weaponId === 'mortar' ? 1.4 : weaponId === 'cluster' ? 1.2 : 1.0;
  const statBase =
    stat === 'shellsLevel' ? 110 : stat === 'radiusLevel' ? 75 : 65;
  const levelMult = currentLevel + 1;
  return Math.round((statBase * levelMult * weaponMult) / 5) * 5;
}

export function calculateRunCredits(stats: Omit<RunStats, 'creditsEarned'>): number {
  const fromScore = Math.round(stats.score * 0.12);
  const fromSolved = stats.correctCount * 12;
  const fromKills = stats.enemiesDefeated * 30;
  const victoryBonus = stats.victory ? 75 : 0;
  const total = fromScore + fromSolved + fromKills + victoryBonus;
  return Math.max(stats.attemptCount > 0 ? 15 : 0, total);
}

export function purchaseWeaponUpgrade(
  save: PlayerSaveData,
  weaponId: WeaponId,
  stat: UpgradeStatKey
): { ok: boolean; reason?: string; nextSave: PlayerSaveData; cost: number } {
  const upgrades = normalizeWeaponUpgrades(save.weaponUpgrades);
  const currentLevel = upgrades[weaponId][stat];
  const maxLevel = MAX_UPGRADE_LEVELS[stat];

  if (currentLevel >= maxLevel) {
    return { ok: false, reason: 'Already at maximum level', nextSave: save, cost: 0 };
  }

  const cost = getUpgradeCost(weaponId, stat, currentLevel);
  if (save.credits < cost) {
    return { ok: false, reason: 'Not enough credits', nextSave: save, cost };
  }

  const nextUpgrades: WeaponUpgradesMap = {
    ...upgrades,
    [weaponId]: {
      ...upgrades[weaponId],
      [stat]: currentLevel + 1,
    },
  };

  return {
    ok: true,
    cost,
    nextSave: {
      ...save,
      credits: save.credits - cost,
      weaponUpgrades: nextUpgrades,
      updatedAtMs: Date.now(),
    },
  };
}

export function unlockWeaponWithCredits(
  save: PlayerSaveData,
  weaponId: WeaponId
): { ok: boolean; reason?: string; nextSave: PlayerSaveData; cost: number } {
  if (save.unlockedWeapons.includes(weaponId)) {
    return { ok: false, reason: 'Weapon already unlocked', nextSave: save, cost: 0 };
  }
  const cost = WEAPON_UNLOCK_COSTS[weaponId];
  if (save.credits < cost) {
    return { ok: false, reason: 'Not enough credits', nextSave: save, cost };
  }
  return {
    ok: true,
    cost,
    nextSave: {
      ...save,
      credits: save.credits - cost,
      unlockedWeapons: [...save.unlockedWeapons, weaponId],
      updatedAtMs: Date.now(),
    },
  };
}
