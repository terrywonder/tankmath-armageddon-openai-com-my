import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateRunCredits,
  createDefaultWeaponUpgrades,
  getEffectiveWeaponSpec,
  getUpgradeCost,
  purchaseWeaponUpgrade,
  unlockWeaponWithCredits,
} from './upgrades';
import type { PlayerSaveData } from './types';

function makeSave(credits = 300): PlayerSaveData {
  return {
    displayName: 'Cadet',
    totalXp: 0,
    credits,
    unlockedStage: 1,
    tutorialCompleted: false,
    bestScore: 0,
    bestStreak: 0,
    totalSolved: 0,
    totalAttempted: 0,
    gamesPlayed: 0,
    preferredSpec: 'balanced',
    soundEnabled: true,
    tankColor: '#2563EB',
    unlockedWeapons: ['standard'],
    weaponUpgrades: createDefaultWeaponUpgrades(),
    lastSyncedDevice: 'Desktop Browser',
    updatedAtMs: 1000,
  };
}

test('getEffectiveWeaponSpec applies damage, blast radius, and extra shells upgrades', () => {
  const upgrades = createDefaultWeaponUpgrades();
  const base = getEffectiveWeaponSpec('standard', upgrades);
  assert.equal(base.baseDamage, 38);
  assert.equal(base.blastRadius, 46);
  assert.equal(base.projectiles, 1);

  upgrades.standard = { damageLevel: 2, radiusLevel: 1, shellsLevel: 1 };
  const upgraded = getEffectiveWeaponSpec('standard', upgrades);
  assert.equal(upgraded.baseDamage, 38 + 18);
  assert.equal(upgraded.blastRadius, 46 + 9);
  assert.equal(upgraded.projectiles, 2);
  assert.ok(upgraded.spreadDeg > 0, 'Multi-shell standard upgrade adds tactical spread');
});

test('purchaseWeaponUpgrade deducts credits, increments level, and blocks insufficient credits or max level', () => {
  const save = makeSave(100);
  const cost1 = getUpgradeCost('standard', 'damageLevel', 0);
  const res1 = purchaseWeaponUpgrade(save, 'standard', 'damageLevel');
  assert.equal(res1.ok, true);
  assert.equal(res1.nextSave.credits, 100 - cost1);
  assert.equal(res1.nextSave.weaponUpgrades.standard.damageLevel, 1);

  // Insufficient funds for next level
  const resFail = purchaseWeaponUpgrade(res1.nextSave, 'standard', 'damageLevel');
  assert.equal(resFail.ok, false);
  assert.equal(resFail.nextSave.credits, res1.nextSave.credits);

  // Max level guard
  const rich = makeSave(5000);
  rich.weaponUpgrades.standard.shellsLevel = 2;
  const maxRes = purchaseWeaponUpgrade(rich, 'standard', 'shellsLevel');
  assert.equal(maxRes.ok, false);
});

test('unlockWeaponWithCredits unlocks cluster/mortar permanently and deducts cost', () => {
  const save = makeSave(150);
  const res = unlockWeaponWithCredits(save, 'cluster');
  assert.equal(res.ok, true);
  assert.equal(res.nextSave.credits, 50);
  assert.ok(res.nextSave.unlockedWeapons.includes('cluster'));
});

test('calculateRunCredits awards victory and accuracy rewards', () => {
  const winCredits = calculateRunCredits({
    mode: 'tutorial',
    victory: true,
    score: 500,
    waveReached: 4,
    highestTier: 4,
    correctCount: 6,
    attemptCount: 7,
    bestStreak: 4,
    directHits: 6,
    enemiesDefeated: 4,
    durationSec: 90,
  });
  const lossCredits = calculateRunCredits({
    mode: 'skirmish',
    victory: false,
    score: 100,
    waveReached: 1,
    highestTier: 2,
    correctCount: 1,
    attemptCount: 3,
    bestStreak: 1,
    directHits: 1,
    enemiesDefeated: 0,
    durationSec: 40,
  });
  assert.ok(winCredits > lossCredits);
  assert.ok(lossCredits >= 15);
});
