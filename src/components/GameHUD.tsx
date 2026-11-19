import React, { useEffect, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
  const [aiHint, setAiHint] = useState<{ qId: string; text: string } | null>(null);
  const [coachmarkDismissedWave, setCoachmarkDismissedWave] = useState<number | null>(null);
  const [consoleCollapsed, setConsoleCollapsed] = useState(false);

  // Auto-expand fire console when player's turn begins so equation is ready
  useEffect(() => {
    if (hud.turnPhase === 'player_aim') {
      setConsoleCollapsed(false);
    }
  }, [hud.turnPhase, question.id]);

  const handleToggleHint = () => {
    const next = !showHint;
    setShowHint(next);
    if (next && (!aiHint || aiHint.qId !== question.id)) {
      const portal = (window as unknown as {
        OpenAIPortal?: { askGemini?: (p: Record<string, unknown>) => Promise<{ ok?: boolean; text?: string }> };
      }).OpenAIPortal;
      if (portal?.askGemini) {
        portal.askGemini({
          mode: 'hint',
          subject: 'Mathematics',
          topic: question.topic,
          prompt: question.prompt,
        }).then((res) => {
          if (res && res.ok && res.text) {
            setAiHint({ qId: question.id, text: res.text });
          }
        }).catch(() => {});
      }
    }
  };

  const windMph = Math.round(Math.abs(hud.windAccel) / 10);
  const windDir = hud.windAccel > 4 ? 'RIGHT' : hud.windAccel < -4 ? 'LEFT' : 'CALM';
  const hpPct = Math.max(0, Math.min(100, Math.round((hud.playerHp / hud.playerMaxHp) * 100)));
  const isPlayerReady = hud.turnPhase === 'player_aim';
  const showCoachmark =
    Boolean(hud.coachmark) && coachmarkDismissedWave !== hud.wave && hud.mode === 'tutorial';

  return (
    <div className="fixed inset-0 z-10 flex flex-col justify-between p-1.5 lg:p-3 pointer-events-none">
      {/* Top Perimeter Corner Clusters (<= 15% height, central playfield unobstructed) */}
      <div className="flex items-start justify-between gap-1 sm:gap-2">
        {/* Top-Left: O.A.I. Brand, Vitality & Run Counters */}
        <div className="pointer-events-auto flex flex-col gap-0.5 rounded-xl border border-indigo-500/35 bg-[#110C28]/95 px-2 sm:px-3 py-1 text-white shadow-lg min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <div className="hidden lg:flex pr-2.5 border-r border-indigo-500/30">
              <OaiBrandLogo compact />
            </div>
            <div>
              <div className="hidden lg:block text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Hull HP
              </div>
              <div className="font-mono-tabular text-xs sm:text-sm font-extrabold leading-tight">
                {hud.playerHp}/{hud.playerMaxHp}
              </div>
            </div>
            <div className="h-2.5 sm:h-3 w-14 sm:w-20 lg:w-28 overflow-hidden rounded-full border border-indigo-500/40 bg-[#1E1642]">
              <div
                className={`h-full transition-transform duration-150 origin-left ${
                  hpPct > 50 ? 'bg-emerald-400' : hpPct > 25 ? 'bg-amber-400' : 'bg-rose-500'
                }`}
                style={{ transform: `scaleX(${hpPct / 100})` }}
              />
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] font-bold text-indigo-200 tabular-nums">
              <span className="whitespace-nowrap">
                {hud.maxWaves ? `Stg ${hud.wave}/${hud.maxWaves}` : `W${hud.wave}`}
                <span className="hidden xl:inline"> · {hud.stageTitle.replace(/^Stage \d+ · /, '')}</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="whitespace-nowrap text-amber-300">{hud.score}</span>
              <span className="hidden sm:inline" aria-hidden="true">·</span>
              <span className="hidden sm:inline whitespace-nowrap text-emerald-400">Streak {hud.streak}</span>
            </div>
          </div>
        </div>

        {/* Top-Center: Wind Gauge & Turn State (desktop only; keeps top-center clear on mobile/tablet) */}
        <div className="pointer-events-auto hidden lg:flex flex-col items-center rounded-xl border border-indigo-500/35 bg-[#110C28]/95 px-3 py-1 text-white shadow-lg">
          <div className="flex items-center gap-2 text-[11px] font-extrabold">
            <Wind className="h-3.5 w-3.5 text-sky-400" />
            <span className="tabular-nums whitespace-nowrap">
              {windDir === 'CALM'
                ? 'WIND CALM'
                : windDir === 'LEFT'
                  ? `◄ WIND ${windMph} MPH`
                  : `WIND ${windMph} MPH ►`}
            </span>
          </div>
          <div className="text-[10px] font-bold text-amber-300 whitespace-nowrap">
            {hud.turnPhase === 'player_aim'
              ? `YOUR TURN · ${hud.enemiesRemaining} ENEMY LEFT`
              : hud.turnPhase === 'firing'
                ? 'SHELL IN FLIGHT'
                : `${hud.activeEnemyName ?? 'ENEMY'} AIMING...`}
          </div>
        </div>

        {/* Top-Right: Utility Controls */}
        <div className="pointer-events-auto flex items-center gap-1 shrink-0">
          <div className="flex lg:hidden items-center gap-1 rounded-lg border border-indigo-500/35 bg-[#110C28]/95 px-2 py-1.5 text-[10px] font-extrabold text-white shadow-lg whitespace-nowrap">
            <Wind className="h-3 w-3 text-sky-400" />
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
            className="hidden lg:flex min-h-[38px] items-center gap-1 rounded-lg border border-indigo-500/35 bg-[#1E1642] px-2.5 text-[11px] font-bold text-indigo-100 shadow-lg hover:border-amber-400 whitespace-nowrap"
          >
            <Cpu className="h-3.5 w-3.5 text-sky-400" />
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
            className="flex h-[32px] w-[32px] lg:h-[38px] lg:w-[38px] items-center justify-center rounded-lg border border-indigo-500/35 bg-[#1E1642] text-white shadow-lg hover:border-amber-400"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4 text-emerald-400" />
            ) : (
              <VolumeX className="h-4 w-4 text-indigo-400" />
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
            className="flex h-[32px] w-[32px] lg:h-[38px] lg:w-[38px] items-center justify-center rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 text-slate-950 shadow-lg hover:brightness-105"
          >
            <Pause className="h-4 w-4 fill-slate-950" />
          </button>
        </div>
      </div>

      {/* Slim Dismissible Tutorial Coachmark (keeps central trajectory unobstructed) */}
      {showCoachmark && (
        <div className="pointer-events-auto mt-1 max-w-sm self-start rounded-lg border border-slate-950 bg-amber-300/95 px-2.5 py-1 text-slate-950 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold leading-tight truncate">{hud.coachmark}</p>
            <button
              type="button"
              aria-label="Dismiss stage tip"
              onClick={() => setCoachmarkDismissedWave(hud.wave)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-slate-950/15 hover:bg-slate-950/25"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Spacer keeping central battlefield open */}
      <div className="flex-1" />

      {/* Feedback Banner above Fire Console */}
      {hud.lastFeedback && (
        <div className="mb-1 self-center pointer-events-none">
          <div
            role="status"
            className={`rounded-lg border-2 border-slate-950 px-3 py-1 text-xs font-extrabold shadow-[0_3px_0_#0f172a] ${
              hud.lastFeedback.ok
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-rose-500 text-white'
            }`}
          >
            {hud.lastFeedback.text}
          </div>
        </div>
      )}

      {/* Bottom-Docked Collapsible Touch-Friendly Aim & Equation Fire Console */}
      <div className="pointer-events-auto mx-auto w-full max-w-5xl flex flex-col items-center">
        <button
          type="button"
          onClick={() => setConsoleCollapsed((prev) => !prev)}
          aria-expanded={!consoleCollapsed}
          aria-label={consoleCollapsed ? 'Expand Aim & Equation Console' : 'Minimize Aim & Equation Console'}
          className="inline-flex items-center gap-1 rounded-t-lg border border-b-0 border-indigo-500/35 bg-[#140F2D]/95 px-3 py-0.5 text-[10px] font-bold text-indigo-200 hover:text-amber-300"
        >
          {consoleCollapsed ? (
            <>
              <ChevronUp className="h-3 w-3" />
              <span>Aim &amp; Equation Console ({question.prompt})</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              <span>Minimize Console</span>
            </>
          )}
        </button>

        {!consoleCollapsed && (
          <div className="w-full rounded-2xl border border-indigo-500/35 bg-[#140F2D]/95 p-1.5 lg:p-2.5 text-white shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              {/* Aim & Weapon Controls */}
              <div className="flex flex-col gap-1 sm:w-[44%]">
                <div className="grid grid-cols-2 gap-1">
                  {/* Angle Stepper */}
                  <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-[#191238] p-0.5">
                    <button
                      type="button"
                      disabled={!isPlayerReady}
                      onClick={() => onAdjustAngle(-3)}
                      aria-label="Decrease aim angle"
                      className="flex h-7 w-7 lg:h-10 lg:w-10 items-center justify-center rounded-md bg-[#231A4D] text-white hover:bg-[#2E2363] disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4 lg:h-5 lg:w-5" />
                    </button>
                    <div className="text-center">
                      <div className="text-[9px] lg:text-[10px] font-bold uppercase text-indigo-300 leading-none">
                        Angle
                      </div>
                      <div className="font-mono-tabular text-xs lg:text-sm font-extrabold text-sky-300 leading-tight">
                        {hud.angleDeg}°
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isPlayerReady}
                      onClick={() => onAdjustAngle(3)}
                      aria-label="Increase aim angle"
                      className="flex h-7 w-7 lg:h-10 lg:w-10 items-center justify-center rounded-md bg-[#231A4D] text-white hover:bg-[#2E2363] disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4 lg:h-5 lg:w-5" />
                    </button>
                  </div>

                  {/* Power Stepper */}
                  <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-[#191238] p-0.5">
                    <button
                      type="button"
                      disabled={!isPlayerReady}
                      onClick={() => onAdjustPower(-5)}
                      aria-label="Decrease shot power"
                      className="flex h-7 w-7 lg:h-10 lg:w-10 items-center justify-center rounded-md bg-[#231A4D] text-white hover:bg-[#2E2363] disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    </button>
                    <div className="text-center">
                      <div className="text-[9px] lg:text-[10px] font-bold uppercase text-indigo-300 leading-none">
                        Power
                      </div>
                      <div className="font-mono-tabular text-xs lg:text-sm font-extrabold text-amber-300 leading-tight">
                        {hud.power}%
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!isPlayerReady}
                      onClick={() => onAdjustPower(5)}
                      aria-label="Increase shot power"
                      className="flex h-7 w-7 lg:h-10 lg:w-10 items-center justify-center rounded-md bg-[#231A4D] text-white hover:bg-[#2E2363] disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                    </button>
                  </div>
                </div>

                {/* Weapon Selector (3 clean equal columns, never clipped) */}
                <div className="grid grid-cols-3 gap-1">
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
                        className={`min-h-[30px] lg:min-h-[40px] rounded-lg border px-1.5 py-0.5 text-left transition-colors ${
                          selected
                            ? 'border-amber-400 bg-[#231A4D] text-amber-200 shadow-xs'
                            : unlocked
                              ? 'border-indigo-500/30 bg-[#191238] text-indigo-100 hover:bg-[#231A4D]'
                              : 'border-indigo-500/15 bg-[#0E0A22]/60 text-indigo-400/60 opacity-60'
                        }`}
                      >
                        <div className="truncate text-[10px] lg:text-[11px] font-extrabold leading-tight">
                          {w.name}
                        </div>
                        <div className="truncate text-[9px] lg:text-[10px] font-medium text-indigo-300 leading-tight">
                          {unlocked ? w.shortRole : `${w.unlockStreak}-Streak`}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Solve Equation to Fire Panel */}
              <div className="flex-1 border-t sm:border-t-0 sm:border-l border-indigo-500/25 pt-1 sm:pt-0 sm:pl-2">
                {isPlayerReady ? (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span className="text-[10px] lg:text-[11px] font-bold uppercase tracking-wider text-amber-300">
                          Tier {question.tier} · {question.topic}
                        </span>
                        <span className="font-mono-tabular text-sm lg:text-lg font-extrabold text-white">
                          {question.prompt}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleHint}
                        aria-label="Toggle equation hint"
                        className="flex h-6 w-6 lg:h-8 lg:w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-500/30 bg-[#1E1642] text-indigo-200 hover:border-amber-400 hover:text-white"
                      >
                        <HelpCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                      </button>
                    </div>

                    {showHint && (
                      <p className="text-[11px] font-medium text-amber-200">
                        {question.hint}
                        {aiHint?.qId === question.id && (
                          <span className="ml-2 text-cyan-300">· 💡 {aiHint.text}</span>
                        )}
                      </p>
                    )}

                    <div className="grid grid-cols-4 gap-1.5">
                      {question.choices.map((choice, idx) => (
                        <button
                          key={`${question.id}_${idx}`}
                          type="button"
                          data-answer-index={idx}
                          onClick={() => {
                            setShowHint(false);
                            onAnswerChoice(choice);
                          }}
                          className="flex min-h-[34px] lg:min-h-[44px] items-center justify-center gap-1 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 px-1.5 py-1 lg:px-2 lg:py-2 font-mono-tabular text-sm lg:text-base font-extrabold text-slate-950 shadow-sm transition-all hover:from-amber-300 hover:to-orange-300 active:translate-y-0.5"
                        >
                          <kbd className="hidden lg:inline rounded bg-slate-950/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-950">
                            {idx + 1}
                          </kbd>
                          <span>{choice}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[50px] lg:min-h-[70px] items-center justify-center rounded-xl bg-slate-800/80 px-3 text-center">
                    <p className="font-display text-xs sm:text-sm lg:text-base font-bold text-amber-300">
                      {hud.turnPhase === 'firing'
                        ? 'Artillery shell in flight...'
                        : `${hud.activeEnemyName ?? 'Enemy tank'} is locking coordinates...`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
