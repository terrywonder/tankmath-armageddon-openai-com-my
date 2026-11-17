import React from 'react';
import {
  Check,
  Coins,
  Flame,
  Layers,
  Lock,
  Maximize2,
  Wrench,
  X,
} from 'lucide-react';
import { WEAPONS } from '../game/constants';
import type { PlayerSaveData, UpgradeStatKey, WeaponId } from '../game/types';
import {
  getEffectiveWeaponSpec,
  getUpgradeCost,
  MAX_UPGRADE_LEVELS,
  WEAPON_UNLOCK_COSTS,
} from '../game/upgrades';

interface UpgradeShopModalProps {
  open: boolean;
  onClose: () => void;
  save: PlayerSaveData;
  onPurchaseUpgrade: (weaponId: WeaponId, stat: UpgradeStatKey) => void;
  onUnlockWeapon: (weaponId: WeaponId) => void;
}

const WEAPON_ORDER: WeaponId[] = ['standard', 'cluster', 'mortar'];

const WEAPON_BADGE_CLASSES: Record<WeaponId, { dot: string; text: string }> = {
  standard: { dot: 'bg-amber-400', text: 'text-amber-300' },
  cluster: { dot: 'bg-pink-500', text: 'text-pink-300' },
  mortar: { dot: 'bg-violet-500', text: 'text-violet-300' },
};

const UPGRADE_ROWS: Array<{
  stat: UpgradeStatKey;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}> = [
  { stat: 'damageLevel', label: 'Improved Damage', Icon: Flame },
  { stat: 'radiusLevel', label: 'Blast Radius', Icon: Maximize2 },
  { stat: 'shellsLevel', label: 'Shells / Shot', Icon: Layers },
];

export const UpgradeShopModal: React.FC<UpgradeShopModalProps> = ({
  open,
  onClose,
  save,
  onPurchaseUpgrade,
  onUnlockWeapon,
}) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Weapon Upgrade Shop"
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#090714]/80 p-3 sm:p-6"
    >
      <div className="flex max-h-[90dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border-2 border-[#312E81] bg-[#140F2D] text-white shadow-[0_8px_0_#090714]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#312E81] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[#090714] bg-gradient-to-br from-[#FDE047] to-[#F59E0B] text-slate-950">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-xl font-extrabold">Weapon Upgrade Shop</h2>
              <p className="text-xs font-medium text-indigo-300">
                Permanent ordnance upgrades synced across all O.A.I. modes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              data-credits-balance="true"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border-2 border-[#312E81] bg-[#1E1742] px-3.5 py-2 text-sm font-extrabold text-amber-300 tabular-nums"
            >
              <Coins className="h-4 w-4 text-amber-400" />
              <span>{save.credits} Credits</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close upgrade shop"
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#312E81] bg-[#1E1742] text-indigo-200 hover:bg-[#292059] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Weapon Cards */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {WEAPON_ORDER.map((weaponId) => {
            const base = WEAPONS[weaponId];
            const effective = getEffectiveWeaponSpec(weaponId, save.weaponUpgrades);
            const levels = save.weaponUpgrades[weaponId];
            const isUnlocked = save.unlockedWeapons.includes(weaponId);
            const unlockCost = WEAPON_UNLOCK_COSTS[weaponId];
            const canAffordUnlock = save.credits >= unlockCost;
            const badge = WEAPON_BADGE_CLASSES[weaponId];

            return (
              <section
                key={weaponId}
                aria-label={`${base.name} upgrades`}
                className="rounded-2xl border-2 border-[#312E81] bg-[#1E1742]/80 p-4"
              >
                {/* Weapon Title & Live Summary */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#312E81] pb-3">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className={`h-4 w-4 shrink-0 rounded-full border-2 border-[#090714] ${badge.dot}`}
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className={`font-display text-lg font-extrabold ${badge.text}`}>
                          {base.name}
                        </h3>
                        {isUnlocked ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/20 px-2 py-0.5 text-[11px] font-bold text-teal-300">
                            <Check className="h-3 w-3" />
                            <span>Unlocked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#292059] px-2 py-0.5 text-[11px] font-bold text-indigo-200">
                            <Lock className="h-3 w-3" />
                            <span>{base.unlockStreak}-Streak or Unlock Now</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-bold text-indigo-200 tabular-nums">
                        <span>{effective.baseDamage} DMG</span>
                        <span aria-hidden="true">·</span>
                        <span>{effective.blastRadius}px Blast</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {effective.projectiles}{' '}
                          {effective.projectiles === 1 ? 'Shell' : 'Shells'} / Shot
                        </span>
                      </div>
                    </div>
                  </div>

                  {!isUnlocked && (
                    <button
                      type="button"
                      data-unlock-weapon={weaponId}
                      disabled={!canAffordUnlock}
                      onClick={() => onUnlockWeapon(weaponId)}
                      className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-[#090714] bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-[0_3px_0_#090714] hover:bg-amber-300 disabled:cursor-not-allowed disabled:bg-[#292059] disabled:text-indigo-400 disabled:shadow-none whitespace-nowrap"
                    >
                      <Coins className="h-3.5 w-3.5" />
                      <span>Unlock · {unlockCost} Cr</span>
                    </button>
                  )}
                </div>

                {/* 3 Permanent Upgrade Tracks */}
                <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                  {UPGRADE_ROWS.map(({ stat, label, Icon }) => {
                    const currentLevel = levels[stat];
                    const maxLevel = MAX_UPGRADE_LEVELS[stat];
                    const isMaxed = currentLevel >= maxLevel;
                    const cost = isMaxed ? 0 : getUpgradeCost(weaponId, stat, currentLevel);
                    const canAfford = save.credits >= cost;

                    const nextSpec = getEffectiveWeaponSpec(weaponId, {
                      ...save.weaponUpgrades,
                      [weaponId]: {
                        ...levels,
                        [stat]: Math.min(maxLevel, currentLevel + 1),
                      },
                    });

                    let deltaLabel = '';
                    if (stat === 'damageLevel') {
                      deltaLabel = isMaxed
                        ? `${effective.baseDamage} DMG`
                        : `${effective.baseDamage} → ${nextSpec.baseDamage} DMG`;
                    } else if (stat === 'radiusLevel') {
                      deltaLabel = isMaxed
                        ? `${effective.blastRadius}px`
                        : `${effective.blastRadius} → ${nextSpec.blastRadius}px`;
                    } else {
                      deltaLabel = isMaxed
                        ? `${effective.projectiles} Shells`
                        : `${effective.projectiles} → ${nextSpec.projectiles} Shells`;
                    }

                    return (
                      <div
                        key={stat}
                        className="flex flex-col justify-between gap-2.5 rounded-xl border border-[#312E81] bg-[#140F2D]/90 p-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-extrabold text-white">
                              <Icon className="h-3.5 w-3.5 text-teal-400" />
                              <span>{label}</span>
                            </span>
                            <span className="font-mono-tabular text-[11px] font-bold text-indigo-300">
                              Lv {currentLevel}/{maxLevel}
                            </span>
                          </div>

                          {/* Level Progress Pips */}
                          <div className="mt-2 flex items-center gap-1" aria-hidden="true">
                            {Array.from({ length: maxLevel }).map((_, idx) => (
                              <span
                                key={idx}
                                className={`h-2 flex-1 rounded-sm border border-[#090714] ${
                                  idx < currentLevel ? 'bg-teal-400' : 'bg-[#292059]'
                                }`}
                              />
                            ))}
                          </div>

                          <div className="mt-2 font-mono-tabular text-xs font-bold text-amber-300">
                            {deltaLabel}
                          </div>
                        </div>

                        <button
                          type="button"
                          data-upgrade={`${weaponId}-${stat}`}
                          disabled={!isUnlocked || isMaxed || !canAfford}
                          onClick={() => onPurchaseUpgrade(weaponId, stat)}
                          className={`flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border-2 border-[#090714] px-3 py-2 text-xs font-extrabold transition-colors ${
                            isMaxed
                              ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                              : !isUnlocked
                                ? 'bg-[#1E1742] text-indigo-400/60 cursor-not-allowed'
                                : canAfford
                                  ? 'bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] text-slate-950 shadow-[0_3px_0_#090714] hover:brightness-105'
                                  : 'bg-[#1E1742] text-indigo-400/60 cursor-not-allowed'
                          }`}
                        >
                          {isMaxed ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>MAXED</span>
                            </>
                          ) : !isUnlocked ? (
                            <span>Unlock First</span>
                          ) : (
                            <>
                              <Coins className="h-3.5 w-3.5" />
                              <span className="tabular-nums">Upgrade · {cost} Cr</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
