import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Cpu,
  HelpCircle,
  Minus,
  Pause,
  Plus,
  Volume2,
  VolumeX,
  Wind,
  X,
} from 'lucide-react';
import { QUALITY_PRESETS } from '../game/constants';
import { getEffectiveWeaponSpec } from '../game/upgrades';
import { OaiBrandLogo } from './OaiBrandLogo';
import type {
  GameMode,
  MathQuestion,
  MathTier,
  QualityTier,
  WeaponId,
  WeaponUpgradesMap,
} from '../game/types';

export interface HudSnapshot {
  mode: GameMode;
  wave: number;
  maxWaves: number | null;
  stageTitle: string;
  coachmark: string | null;
  playerHp: number;
  playerMaxHp: number;
  enemiesRemaining: number;
  score: number;
  streak: number;
  tier: MathTier;
  windAccel: number;
  angleDeg: number;
  power: number;
  selectedWeapon: WeaponId;
  unlockedWeapons: WeaponId[];
  turnPhase: 'player_aim' | 'firing' | 'enemy_turn';
  activeEnemyName: string | null;
  lastFeedback: { ok: boolean; text: string } | null;
}

interface GameHUDProps {
  hud: HudSnapshot;
  question: MathQuestion;
  qualityTier: QualityTier;
  soundEnabled: boolean;
  weaponUpgrades: WeaponUpgradesMap;
  onAdjustAngle: (delta: number) => void;
  onAdjustPower: (delta: number) => void;
  onSelectWeapon: (id: WeaponId) => void;
  onAnswerChoice: (choice: number) => void;
  onPause: () => void;
  onToggleSound: () => void;
  onCycleQuality: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  question,
  qualityTier,
  soundEnabled,
  weaponUpgrades,
  onAdjustAngle,
  onAdjustPower,
  onSelectWeapon,
  onAnswerChoice,
  onPause,
  onToggleSound,
  onCycleQuality,
}) => {
  const [showHint, setShowHint] = useState(false);
  const [coachmarkDismissedWave, setCoachmarkDismissedWave] = useState<number | null>(null);

  const windMph = Math.round(Math.abs(hud.windAccel) / 10);
  const windDir = hud.windAccel > 4 ? 'RIGHT' : hud.windAccel < -4 ? 'LEFT' : 'CALM';
  const hpPct = Math.max(0, Math.min(100, Math.round((hud.playerHp / hud.playerMaxHp) * 100)));
  const isPlayerReady = hud.turnPhase === 'player_aim';
  const showCoachmark =
    Boolean(hud.coachmark) && coachmarkDismissedWave !== hud.wave && hud.mode === 'tutorial';

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-2.5 sm:p-4 pointer-events-none">
      {/* Top Perimeter Corner Clusters (<= 15% height, central playfield unobstructed) */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: O.A.I. Brand, Vitality & Run Counters */}
        <div className="pointer-events-auto flex flex-col gap-1.5 rounded-xl border border-indigo-500/35 bg-[#110C28]/95 px-3.5 py-2 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex pr-3 border-r border-indigo-500/30">
              <OaiBrandLogo compact />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Hull HP
              </div>
              <div className="font-mono-tabular text-sm sm:text-base font-extrabold leading-tight">
                {hud.playerHp}/{hud.playerMaxHp}
              </div>
            </div>
            <div className="h-3 w-20 sm:w-28 overflow-hidden rounded-full border border-indigo-500/40 bg-[#1E1642]">
              <div
                className={`h-full transition-transform duration-150 origin-left ${
                  hpPct > 50 ? 'bg-emerald-400' : hpPct > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ transform: `scaleX(${hpPct / 100})` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] font-bold text-indigo-200 tabular-nums">
            <span className="whitespace-nowrap">
              {hud.maxWaves ? `Stage ${hud.wave}/${hud.maxWaves}` : `Wave ${hud.wave}`}
              <span className="hidden sm:inline"> · {hud.stageTitle.replace(/^Stage \d+ · /, '')}</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap text-amber-300">Score {hud.score}</span>
            <span aria-hidden="true">·</span>
            <span className="whitespace-nowrap text-emerald-400">Streak {hud.streak}</span>
          </div>
        </div>

        {/* Top-Center: Wind Gauge & Turn State */}
        <div className="pointer-events-auto hidden md:flex flex-col items-center rounded-xl border border-indigo-500/35 bg-[#110C28]/95 px-4 py-1.5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-xs font-extrabold">
            <Wind className="h-4 w-4 text-sky-400" />
            <span className="tabular-nums whitespace-nowrap">
              {windDir === 'CALM'
                ? 'WIND CALM'
                : windDir === 'LEFT'
                  ? `◄ WIND ${windMph} MPH`
                  : `WIND ${windMph} MPH ►`}
            </span>
          </div>
          <div className="text-[11px] font-bold text-amber-300 whitespace-nowrap">
            {hud.turnPhase === 'player_aim'
              ? `YOUR TURN · ${hud.enemiesRemaining} ENEMY LEFT`
              : hud.turnPhase === 'firing'
                ? 'SHELL IN FLIGHT'
                : `${hud.activeEnemyName ?? 'ENEMY'} AIMING...`}
          </div>
        </div>

        {/* Top-Right: Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1.5">
          <div className="flex md:hidden items-center gap-1 rounded-xl border border-indigo-500/35 bg-[#110C28]/95 px-2.5 py-2 text-[11px] font-extrabold text-white shadow-lg whitespace-nowrap">
            <Wind className="h-3.5 w-3.5 text-sky-400" />
            <span className="tabular-nums">
              {windDir === 'CALM' ? '0' : windDir === 'LEFT' ? `◄${windMph}` : `${windMph}►`}
            </span>
          </div>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onCycleQuality();
            }}
            aria-label={`Graphics mode: ${QUALITY_PRESETS[qualityTier].label}`}
            className="hidden sm:flex min-h-[44px] items-center gap-1.5 rounded-xl border border-indigo-500/35 bg-[#1E1642] px-3 text-xs font-bold text-indigo-100 shadow-lg hover:border-amber-400 whitespace-nowrap"
          >
            <Cpu className="h-4 w-4 text-sky-400" />
            <span>{qualityTier.toUpperCase()}</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleSound();
            }}
            aria-label={soundEnabled ? 'Mute sound [M]' : 'Unmute sound [M]'}
            className="flex h-[44px] w-[44px] items-center justify-center rounded-xl border border-indigo-500/35 bg-[#1E1642] text-white shadow-lg hover:border-amber-400"
          >
            {soundEnabled ? (
              <Volume2 className="h-5 w-5 text-emerald-400" />
            ) : (
              <VolumeX className="h-5 w-5 text-indigo-400" />
            )}
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onPause();
            }}
            aria-label="Pause game [P]"
            className="flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 text-slate-950 shadow-lg hover:brightness-105"
          >
            <Pause className="h-5 w-5 fill-slate-950" />
          </button>
        </div>
      </div>

      {/* Non-Blocking Tutorial Coachmark (top-left, clear of central trajectory) */}
      {showCoachmark && (
        <div className="pointer-events-auto mt-2 max-w-md self-start rounded-xl border-2 border-slate-950 bg-amber-300 px-3.5 py-2 text-slate-950 shadow-[0_3px_0_#0f172a]">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs sm:text-sm font-bold leading-snug">{hud.coachmark}</p>
            <button
              type="button"
              aria-label="Dismiss stage tip"
              onClick={() => setCoachmarkDismissedWave(hud.wave)}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-950/15 hover:bg-slate-950/25"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Spacer keeping central battlefield open */}
      <div className="flex-1" />

      {/* Feedback Banner above Fire Console */}
      {hud.lastFeedback && (
        <div className="mb-2 self-center pointer-events-none">
          <div
            role="status"
            className={`rounded-xl border-2 border-slate-950 px-4 py-1.5 text-xs sm:text-sm font-extrabold shadow-[0_3px_0_#0f172a] ${
              hud.lastFeedback.ok
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-rose-500 text-white'
            }`}
          >
            {hud.lastFeedback.text}
          </div>
        </div>
      )}

      {/* Bottom-Docked Touch-Friendly Aim & Equation Fire Console */}
      <div className="pointer-events-auto mx-auto w-full max-w-5xl rounded-2xl border border-indigo-500/35 bg-[#140F2D]/95 p-2.5 sm:p-3.5 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5 sm:gap-3">
          {/* Aim & Weapon Controls */}
          <div className="flex flex-col gap-2 lg:w-[44%]">
            <div className="grid grid-cols-2 gap-2">
              {/* Angle Stepper */}
              <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-[#191238] p-1">
                <button
                  type="button"
                  disabled={!isPlayerReady}
                  onClick={() => onAdjustAngle(-3)}
                  aria-label="Decrease aim angle"
                  className="flex h-11 w-10 sm:w-11 items-center justify-center rounded-lg bg-[#231A4D] text-white hover:bg-[#2E2363] disabled:opacity-40"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-indigo-300">Angle</div>
                  <div className="font-mono-tabular text-sm font-extrabold text-sky-300">
                    {hud.angleDeg}°
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isPlayerReady}
                  onClick={() => onAdjustAngle(3)}
                  aria-label="Increase aim angle"
                  className="flex h-11 w-10 sm:w-11 items-center justify-center rounded-lg bg-[#231A4D] text-white hover:bg-[#2E2363] disabled:opacity-40"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Power Stepper */}
              <div className="flex items-center justify-between rounded-xl border border-indigo-500/30 bg-[#191238] p-1">
                <button
                  type="button"
                  disabled={!isPlayerReady}
                  onClick={() => onAdjustPower(-5)}
                  aria-label="Decrease shot power"
                  className="flex h-11 w-10 sm:w-11 items-center justify-center rounded-lg bg-[#231A4D] text-white hover:bg-[#2E2363] disabled:opacity-40"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <div className="text-[10px] font-bold uppercase text-indigo-300">Power</div>
                  <div className="font-mono-tabular text-sm font-extrabold text-amber-300">
                    {hud.power}%
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!isPlayerReady}
                  onClick={() => onAdjustPower(5)}
                  aria-label="Increase shot power"
                  className="flex h-11 w-10 sm:w-11 items-center justify-center rounded-lg bg-[#231A4D] text-white hover:bg-[#2E2363] disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weapon Selector (3 clean equal columns, never clipped) */}
            <div className="grid grid-cols-3 gap-1.5">
              {(['standard', 'cluster', 'mortar'] as WeaponId[]).map((wId) => {
                const w = getEffectiveWeaponSpec(wId, weaponUpgrades);
                const unlocked = hud.unlockedWeapons.includes(wId);
                const selected = hud.selectedWeapon === wId;
                return (
                  <button
                    key={wId}
                    type="button"
                    disabled={!unlocked || !isPlayerReady}
                    onClick={() => onSelectWeapon(wId)}
                    title={
                      unlocked
                        ? `${w.name} (${w.shortRole})`
                        : `Unlock with ${w.unlockStreak}-streak or Upgrade Shop`
                    }
                    className={`min-h-[44px] rounded-xl border px-2 py-1 text-left transition-colors ${
                      selected
                        ? 'border-amber-400 bg-[#231A4D] text-amber-200 shadow-xs'
                        : unlocked
                          ? 'border-indigo-500/30 bg-[#191238] text-indigo-100 hover:bg-[#231A4D]'
                          : 'border-indigo-500/15 bg-[#0E0A22]/60 text-indigo-400/60 opacity-60'
                    }`}
                  >
                    <div className="truncate text-[11px] font-extrabold leading-tight">
                      {w.name}
                    </div>
                    <div className="truncate text-[10px] font-medium text-indigo-300 leading-tight">
                      {unlocked ? w.shortRole : `${w.unlockStreak}-Streak`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Solve Equation to Fire Panel */}
          <div className="flex-1 border-t lg:border-t-0 lg:border-l border-indigo-500/25 pt-2 lg:pt-0 lg:pl-3">
            {isPlayerReady ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                      Tier {question.tier} · {question.topic}
                    </span>
                    <span className="font-mono-tabular text-lg sm:text-xl font-extrabold text-white">
                      {question.prompt}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowHint((h) => !h)}
                    aria-label="Toggle equation hint"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-[#1E1642] text-indigo-200 hover:border-amber-400 hover:text-white"
                  >
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </div>

                {showHint && (
                  <p className="text-xs font-medium text-amber-200">{question.hint}</p>
                )}

                <div className="grid grid-cols-4 gap-2">
                  {question.choices.map((choice, idx) => (
                    <button
                      key={`${question.id}_${idx}`}
                      type="button"
                      data-answer-index={idx}
                      onClick={() => {
                        setShowHint(false);
                        onAnswerChoice(choice);
                      }}
                      className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 px-2 py-2 font-mono-tabular text-base sm:text-lg font-extrabold text-slate-950 shadow-sm transition-all hover:from-amber-300 hover:to-orange-300 active:translate-y-0.5"
                    >
                      <kbd className="hidden sm:inline rounded bg-slate-950/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-950">
                        {idx + 1}
                      </kbd>
                      <span>{choice}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[76px] items-center justify-center rounded-xl bg-slate-800/80 px-4 text-center">
                <p className="font-display text-base sm:text-lg font-bold text-amber-300">
                  {hud.turnPhase === 'firing'
                    ? 'Artillery shell in flight...'
                    : `${hud.activeEnemyName ?? 'Enemy tank'} is locking coordinates...`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
