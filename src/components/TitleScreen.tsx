import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Coins,
  Cpu,
  Maximize2,
  Minimize2,
  Play,
  Swords,
  Trophy,
  User,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react';
import { QUALITY_PRESETS } from '../game/constants';
import type { GameMode, MathTier, PlayerSaveData } from '../game/types';
import { OaiBrandLogo } from './OaiBrandLogo';
import { PWAInstallButton } from './PWAInstallButton';

interface TitleScreenProps {
  save: PlayerSaveData;
  portalTotalXp?: number;
  selectedSkirmishTier: MathTier;
  onSelectSkirmishTier: (tier: MathTier) => void;
  onStartGame: (mode: GameMode) => void;
  onOpenLeaderboard: () => void;
  onOpenUpgradeShop: () => void;
  onCycleQuality: () => void;
  onToggleSound: () => void;
  isSignedIn: boolean;
  isOnline: boolean;
}

const TIER_LABELS: Record<MathTier, string> = {
  1: 'Primary 1–3 · Add & Subtract',
  2: 'Primary 4–6 · Multiply & Divide',
  3: 'Form 1–2 · Order of Operations',
  4: 'Form 3 · Linear Equations',
  5: 'Form 4–5 (SPM) · Exponents & Roots',
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  save,
  portalTotalXp,
  selectedSkirmishTier,
  onSelectSkirmishTier,
  onStartGame,
  onOpenLeaderboard,
  onOpenUpgradeShop,
  onCycleQuality,
  onToggleSound,
  isSignedIn,
  isOnline,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const qualityPreset = QUALITY_PRESETS[save.preferredSpec];
  const accuracy =
    save.totalAttempted > 0
      ? Math.round((save.totalSolved / save.totalAttempted) * 100)
      : 100;
  const effectiveXp = Math.max(save.totalXp, portalTotalXp ?? 0);
  const scholarLevel = Math.max(1, Math.floor(effectiveXp / 300) + 1);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between gap-2 p-3 sm:p-5 overflow-y-auto overscroll-contain">
      {/* Top O.A.I. Malaysia Portal Header Bar */}
      <header className="pointer-events-auto w-full shrink-0 rounded-2xl border border-indigo-500/30 bg-[#110C28]/95 px-3.5 py-2 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Left: Enhanced O.A.I. Malaysia Logo + Curriculum Tag */}
          <div className="flex items-center gap-3">
            <a href="../../" aria-label="Return to O.A.I. Malaysia Arcade Portal" className="hover:opacity-90 transition-opacity">
              <OaiBrandLogo />
            </a>
            <span className="hidden lg:inline-block h-5 w-px bg-indigo-500/30" aria-hidden="true" />
            <a
              href="../../"
              className="hidden lg:inline-flex items-center gap-1.5 rounded-md border border-indigo-500/30 bg-[#1E1642] px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:border-amber-400 transition-colors"
            >
              <span>Arcade Portal</span>
              <span aria-hidden="true" className="text-indigo-400">·</span>
              <span className="text-emerald-400">Mathematics Artillery</span>
            </a>
          </div>

          {/* Right: Scholar Profile Pill & Hardware/Audio Utilities */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="inline-flex min-h-[38px] items-center gap-1.5 sm:gap-2 rounded-lg border border-indigo-500/35 bg-[#1E1642] px-2.5 sm:px-3 py-1 text-xs font-semibold text-white transition-colors hover:border-amber-400 whitespace-nowrap shrink-0"
            >
              <User className="h-3.5 w-3.5 text-amber-400" />
              <span>{save.displayName}</span>
              <span aria-hidden="true" className="text-indigo-400/50">·</span>
              <span className="font-mono-tabular font-bold text-emerald-400">
                Lvl {scholarLevel}
              </span>
              <span aria-hidden="true" className="hidden md:inline text-indigo-400/50">·</span>
              <span className="hidden md:inline font-mono-tabular font-bold text-amber-300">
                {effectiveXp.toLocaleString()} XP
              </span>
              <span aria-hidden="true" className="hidden sm:inline text-indigo-400/50">·</span>
              <span className="hidden sm:inline font-mono-tabular font-bold text-sky-300">
                Best {save.bestScore} ({accuracy}%)
              </span>
            </button>

            <PWAInstallButton />

            <button
              type="button"
              onClick={onCycleQuality}
              aria-label={`Graphics spec ${qualityPreset.label}`}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-indigo-500/35 bg-[#1E1642] px-2.5 sm:px-3 py-1 text-xs font-semibold text-indigo-100 transition-colors hover:border-amber-400 whitespace-nowrap shrink-0"
            >
              <Cpu className="h-3.5 w-3.5 text-sky-400" />
              <span>{qualityPreset.label}</span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              className="hidden sm:flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-indigo-500/35 bg-[#1E1642] text-indigo-100 transition-colors hover:border-amber-400"
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4 text-amber-300" />
              ) : (
                <Maximize2 className="h-4 w-4 text-sky-400" />
              )}
            </button>

            <button
              type="button"
              onClick={onToggleSound}
              aria-label={save.soundEnabled ? 'Mute audio' : 'Unmute audio'}
              className="flex min-h-[38px] min-w-[38px] items-center justify-center rounded-lg border border-indigo-500/35 bg-[#1E1642] text-indigo-100 transition-colors hover:border-amber-400"
            >
              {save.soundEnabled ? (
                <Volume2 className="h-4 w-4 text-emerald-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-indigo-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Portal Overview Card (Upper-Left Sky Zone so Both Tanks Stay Visible) */}
      <div className="mt-2 sm:mt-3 mb-auto max-w-2xl pointer-events-auto">
        <div
          className="relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-[#140F2D]/92 p-3.5 sm:p-5 shadow-xl"
          style={{
            backgroundImage:
              'radial-gradient(circle at 88% 14%, rgba(56, 189, 248, 0.16) 0%, rgba(168, 85, 247, 0.12) 40%, rgba(20, 15, 45, 0.95) 85%)',
          }}
        >
          {/* Curriculum Eyebrow */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            <span>MOE Malaysia Aligned · KSSR · KSSM · SPM</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-400">{TIER_LABELS[selectedSkirmishTier]}</span>
          </div>

          {/* Custom Vector Tank Emblem & Game Title Lockup */}
          <div className="mt-1.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <svg
              viewBox="0 0 540 104"
              className="w-full max-w-[320px] sm:max-w-[340px] shrink-0 drop-shadow-[0_4px_0_rgba(9,7,20,0.95)]"
              role="img"
              aria-label="TankMath Armageddon"
            >
              <g>
                <rect
                  x="6"
                  y="8"
                  width="76"
                  height="76"
                  rx="16"
                  fill="#F59E0B"
                  stroke="#090714"
                  strokeWidth="5"
                />
                <rect x="19" y="54" width="50" height="13" rx="6.5" fill="#1E293B" stroke="#090714" strokeWidth="3" />
                <rect x="24" y="42" width="40" height="13" rx="5" fill="#2563EB" stroke="#090714" strokeWidth="3" />
                <path d="M33 42 C33 29 55 29 55 42 Z" fill="#38BDF8" stroke="#090714" strokeWidth="3" />
                <line x1="50" y1="35" x2="69" y2="23" stroke="#090714" strokeWidth="6.5" strokeLinecap="round" />
                <line x1="50" y1="35" x2="69" y2="23" stroke="#E2E8F0" strokeWidth="3.2" strokeLinecap="round" />
                <text
                  x="44"
                  y="24"
                  textAnchor="middle"
                  fill="#090714"
                  fontFamily="Bricolage Grotesque, sans-serif"
                  fontWeight="800"
                  fontSize="14"
                >
                  ∑×÷
                </text>
              </g>
              <text
                x="98"
                y="46"
                fill="#FFFFFF"
                stroke="#090714"
                strokeWidth="7.5"
                paintOrder="stroke fill"
                fontFamily="Bricolage Grotesque, sans-serif"
                fontWeight="800"
                fontSize="40"
                letterSpacing="-1"
              >
                TANKMATH
              </text>
              <text
                x="100"
                y="82"
                fill="#FBBF24"
                stroke="#090714"
                strokeWidth="6.5"
                paintOrder="stroke fill"
                fontFamily="Bricolage Grotesque, sans-serif"
                fontWeight="800"
                fontSize="26"
                letterSpacing="1.5"
              >
                ARMAGEDDON
              </text>
            </svg>

            <p className="text-xs text-indigo-100/90 leading-snug">
              Solve equations to lock artillery coordinates, upgrade heavy ordnance, and blast rival tanks across destructible hills.
            </p>
          </div>

          {/* Primary Launchpad Actions (3 Primary Game Launch Buttons in 1 Row on sm+) */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              data-start="true"
              onClick={() => onStartGame('tutorial')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-orange-400 px-3.5 py-2 text-xs sm:text-sm font-extrabold text-slate-950 shadow-sm transition-all hover:from-amber-300 hover:to-orange-300 whitespace-nowrap"
            >
              <Play className="h-4 w-4 shrink-0 fill-slate-950" />
              <span>{save.tutorialCompleted ? 'Replay Tutorial' : 'Play Tutorial'}</span>
              {save.tutorialCompleted ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-900" />
              ) : (
                <kbd className="hidden md:inline rounded bg-slate-950/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-950">
                  Enter
                </kbd>
              )}
            </button>

            <button
              type="button"
              onClick={() => onStartGame('skirmish')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-400/80 bg-[#231A4D] px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#2C215E] whitespace-nowrap"
            >
              <Swords className="h-4 w-4 shrink-0 text-sky-400" />
              <span>Skirmish · Tier {selectedSkirmishTier}</span>
            </button>

            <button
              type="button"
              onClick={() => onStartGame('endless')}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-indigo-500/35 bg-[#191238] px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm transition-colors hover:border-amber-400 hover:bg-[#231A4D] whitespace-nowrap"
            >
              <Zap className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Endless Survival</span>
            </button>
          </div>

          {/* Syllabus Tier Selector + Armory & Leaderboard Strip */}
          <div className="mt-3 pt-2.5 border-t border-indigo-500/25 flex flex-wrap items-center justify-between gap-2">
            <div
              role="group"
              aria-label="Skirmish starting math tier"
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-[#0E0A22] p-0.5"
            >
              <span className="px-2 text-[11px] font-semibold text-indigo-200/85">Tier:</span>
              {([1, 2, 3, 4, 5] as MathTier[]).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => onSelectSkirmishTier(tier)}
                  aria-label={`Math Tier ${tier}`}
                  aria-pressed={selectedSkirmishTier === tier}
                  className={`min-h-[30px] min-w-[30px] rounded-md px-2 text-xs font-bold transition-colors ${
                    selectedSkirmishTier === tier
                      ? 'bg-amber-400 text-slate-950 shadow-2xs'
                      : 'text-indigo-200/75 hover:text-white'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenUpgradeShop}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-indigo-500/35 bg-[#1E1642] px-3 py-1 text-xs font-semibold text-white transition-colors hover:border-amber-400 whitespace-nowrap shrink-0"
              >
                <Wrench className="h-3.5 w-3.5 text-amber-400" />
                <span>Upgrade Shop</span>
                <span className="inline-flex items-center gap-1 rounded bg-[#110C28] border border-indigo-500/30 px-1.5 py-0.5 font-mono-tabular text-[11px] font-bold text-amber-300">
                  <Coins className="h-3 w-3 text-amber-400" />
                  <span>{save.credits} Cr</span>
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-indigo-500/35 bg-[#1E1642] px-3 py-1 text-xs font-semibold text-white transition-colors hover:border-amber-400 whitespace-nowrap shrink-0"
              >
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span>Leaderboard &amp; Sync</span>
                <Cloud
                  className={`h-3.5 w-3.5 ${
                    isSignedIn && isOnline ? 'text-emerald-400' : 'text-indigo-300'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Control Hint Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-white drop-shadow-[0_2px_2px_rgba(9,7,20,0.95)]">
        <span>Drag Battlefield or Arrows to Aim · Keys 1–4 Solve &amp; Fire · Esc Pause</span>
        <span>O.A.I. Malaysia · Offline-Ready PWA &amp; Cross-Device Cloud Sync</span>
      </div>
    </div>
  );
};
