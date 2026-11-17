import React from 'react';
import { Cloud, Coins, Cpu, Home, Play, RotateCcw, Trophy, Wrench } from 'lucide-react';
import { QUALITY_PRESETS } from '../game/constants';
import type { GameScreenState, QualityTier, RunStats } from '../game/types';

interface StatusModalsProps {
  screenState: GameScreenState;
  runStats: RunStats | null;
  bestScore: number;
  credits: number;
  qualityTier: QualityTier;
  isSignedIn: boolean;
  isOnline: boolean;
  onResume: () => void;
  onRestart: () => void;
  onQuitToTitle: () => void;
  onCycleQuality: () => void;
  onOpenLeaderboard: () => void;
  onOpenUpgradeShop: () => void;
}

export const StatusModals: React.FC<StatusModalsProps> = ({
  screenState,
  runStats,
  bestScore,
  credits,
  qualityTier,
  isSignedIn,
  isOnline,
  onResume,
  onRestart,
  onQuitToTitle,
  onCycleQuality,
  onOpenLeaderboard,
  onOpenUpgradeShop,
}) => {
  if (screenState !== 'paused' && screenState !== 'gameover') {
    return null;
  }

  if (screenState === 'paused') {
    const preset = QUALITY_PRESETS[qualityTier];
    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Game Paused"
        className="fixed inset-0 z-30 flex items-center justify-center bg-[#090714]/75 p-4 overflow-y-auto overscroll-contain"
      >
        <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto my-auto rounded-2xl border-2 border-[#312E81] bg-[#140F2D] p-6 text-white shadow-[0_6px_0_#090714]">
          <h2 className="font-display text-2xl font-extrabold text-white">Battle Paused</h2>
          <p className="mt-1 text-sm text-indigo-200">
            Adjust performance settings or jump right back into the artillery duel.
          </p>

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="button"
              onClick={onResume}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#090714] bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] px-4 py-2.5 text-base font-extrabold text-slate-950 shadow-[0_3px_0_#090714] hover:brightness-105"
            >
              <Play className="h-5 w-5 fill-slate-950" />
              <span>Resume Battle</span>
            </button>

            <button
              type="button"
              onClick={onCycleQuality}
              className="flex min-h-[48px] w-full items-center justify-between rounded-xl border-2 border-[#312E81] bg-[#1E1742] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#292059]"
            >
              <span className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-teal-400" />
                <span>Graphics Quality</span>
              </span>
              <span className="text-teal-300">{preset.label}</span>
            </button>

            <button
              type="button"
              onClick={onRestart}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#090714] bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-slate-950 shadow-[0_3px_0_#090714] hover:bg-amber-300"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Restart Mission</span>
            </button>

            <button
              type="button"
              onClick={onQuitToTitle}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#312E81] bg-[#1E1742] px-4 py-2.5 text-sm font-bold text-indigo-100 hover:bg-[#292059]"
            >
              <Home className="h-4 w-4" />
              <span>Return to Title</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Victory / Game Over Modal
  const victory = runStats?.victory ?? false;
  const accuracy =
    runStats && runStats.attemptCount > 0
      ? Math.round((runStats.correctCount / runStats.attemptCount) * 100)
      : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={victory ? 'Victory Summary' : 'Defeat Summary'}
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#090714]/80 p-4 overflow-y-auto overscroll-contain"
    >
      <div className="w-full max-w-md max-h-[90dvh] overflow-y-auto my-auto rounded-2xl border-2 border-[#312E81] bg-[#140F2D] p-6 text-white shadow-[0_6px_0_#090714]">
        <div className="text-xs font-extrabold uppercase tracking-wider text-teal-300">
          {runStats?.mode === 'tutorial'
            ? 'O.A.I. Dynamic Tutorial'
            : runStats?.mode === 'endless'
              ? 'Endless Survival'
              : 'Skirmish Battle'}
        </div>
        <h2
          className={`mt-1 font-display text-3xl font-extrabold ${
            victory ? 'text-teal-300' : 'text-rose-400'
          }`}
        >
          {victory ? 'Mission Victory!' : 'Tank Destroyed'}
        </h2>
        <p className="mt-1 text-sm text-indigo-200">
          {victory
            ? 'Your math precision dominated the battlefield.'
            : 'Recalibrate your equations and launch a counter-offensive.'}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#312E81] bg-[#1E1742] p-3">
            <div className="text-xs font-bold text-indigo-300">Run Score</div>
            <div className="mt-0.5 font-mono-tabular text-2xl font-extrabold text-amber-300">
              {runStats?.score ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-indigo-300 tabular-nums">
              Best: {Math.max(bestScore, runStats?.score ?? 0)}
            </div>
          </div>

          <div className="rounded-xl border border-[#312E81] bg-[#1E1742] p-3">
            <div className="text-xs font-bold text-indigo-300">Math Accuracy</div>
            <div className="mt-0.5 font-mono-tabular text-2xl font-extrabold text-teal-300">
              {accuracy}%
            </div>
            <div className="text-[11px] font-semibold text-indigo-300 tabular-nums">
              {runStats?.correctCount ?? 0}/{runStats?.attemptCount ?? 0} Solved
            </div>
          </div>

          <div className="rounded-xl border border-[#312E81] bg-[#1E1742] p-3">
            <div className="text-xs font-bold text-indigo-300">Best Streak</div>
            <div className="mt-0.5 font-mono-tabular text-xl font-extrabold text-sky-300">
              {runStats?.bestStreak ?? 0}
            </div>
            <div className="text-[11px] font-semibold text-indigo-300 tabular-nums">
              Peak: Tier {runStats?.highestTier ?? 1}
            </div>
          </div>

          <div className="rounded-xl border border-[#312E81] bg-[#1E1742] p-3">
            <div className="text-xs font-bold text-indigo-300">Credits Earned</div>
            <div className="mt-0.5 flex items-center gap-1.5 font-mono-tabular text-xl font-extrabold text-amber-300">
              <Coins className="h-4 w-4 text-amber-400" />
              <span>+{runStats?.creditsEarned ?? 0}</span>
            </div>
            <div className="text-[11px] font-semibold text-indigo-300 tabular-nums">
              Balance: {credits} Cr
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-[#312E81] bg-[#1E1742]/70 px-3 py-2 text-xs font-semibold text-indigo-200">
          <Cloud className={`h-4 w-4 shrink-0 ${isSignedIn && isOnline ? 'text-teal-400' : 'text-amber-400'}`} />
          <span>
            {isSignedIn && isOnline
              ? 'Progress synced to Cloud & Global Leaderboard.'
              : isOnline
                ? 'Saved locally. Sign in via Leaderboard to sync across devices.'
                : 'Saved offline locally. Auto-syncs when reconnected.'}
          </span>
        </div>

        <div className="mt-5 flex flex-col gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              data-start="true"
              onClick={onRestart}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#090714] bg-amber-400 px-4 py-2.5 text-sm sm:text-base font-extrabold text-slate-950 shadow-[0_3px_0_#090714] hover:bg-amber-300"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Play Again</span>
            </button>

            <button
              type="button"
              onClick={onOpenUpgradeShop}
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#090714] bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] px-4 py-2.5 text-sm sm:text-base font-extrabold text-slate-950 shadow-[0_3px_0_#090714] hover:brightness-105"
            >
              <Wrench className="h-4 w-4" />
              <span>Upgrade Shop</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-[#312E81] bg-[#1E1742] px-3 py-2 text-sm font-bold text-white hover:bg-[#292059]"
            >
              <Trophy className="h-4 w-4 text-amber-400" />
              <span>Leaderboard</span>
            </button>
            <button
              type="button"
              onClick={onQuitToTitle}
              className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border-2 border-[#312E81] bg-[#1E1742] px-3 py-2 text-sm font-bold text-indigo-100 hover:bg-[#292059]"
            >
              <Home className="h-4 w-4" />
              <span>Title Menu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
