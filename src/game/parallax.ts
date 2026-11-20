import type { GameMode, GameScreenState, MathTier } from './types';

export interface ParallaxProgressInput {
  screenState: GameScreenState;
  mode: GameMode;
  wave: number;
  maxWaves: number | null;
  tier: MathTier;
  score: number;
}

export interface ParallaxCloudSpec {
  baseX: number;
  y: number;
  scale: number;
  speedFactor: number;
  layer: 'far' | 'near';
}

export interface WindStreakSpec {
  baseX: number;
  y: number;
  length: number;
  speedFactor: number;
  waveAmp: number;
}

export interface ParallaxState {
  smoothWind: number;
  smoothProgress: number;
  farCloudScroll: number;
  nearCloudScroll: number;
  windRibbonScroll: number;
  windSwayOffset: number;
  elapsedSec: number;
  clouds: ParallaxCloudSpec[];
  streaks: WindStreakSpec[];
}

export interface ParallaxLayerOffsets {
  celestialX: number;
  farMountainsX: number;
  farCloudsX: number;
  midHillsX: number;
  nearFoothillsX: number;
  nearCloudsX: number;
  windStreaksX: number;
}

export interface SkyAtmosphere {
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  farRidgeFill: string;
  farRidgeHighlight: string;
  midHillFill: string;
  midHillStroke: string;
  nearFoothillFill: string;
  celestialColor: string;
  celestialHalo: string;
  celestialXRatio: number;
  celestialYRatio: number;
  starAlpha: number;
  cloudFill: string;
  farCloudAlpha: number;
}

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface AtmosphereKeyframe {
  t: number;
  skyTop: RgbColor;
  skyMid: RgbColor;
  skyBottom: RgbColor;
  farRidge: RgbColor;
  farRidgeHighlight: RgbColor;
  midHill: RgbColor;
  midHillStroke: RgbColor;
  nearFoothill: RgbColor;
  celestial: RgbColor;
  celestialHalo: RgbColor;
  celestialXRatio: number;
  celestialYRatio: number;
  starAlpha: number;
  cloudFill: RgbColor;
}

const ATMOSPHERE_KEYFRAMES: AtmosphereKeyframe[] = [
  // 0.00: Crisp Morning Worms Armageddon Sky (Title & Wave 1)
  {
    t: 0,
    skyTop: { r: 2, g: 132, b: 199 },      // #0284C7
    skyMid: { r: 56, g: 189, b: 248 },     // #38BDF8
    skyBottom: { r: 186, g: 230, b: 253 }, // #BAE6FD
    farRidge: { r: 14, g: 116, b: 144 },   // #0E7490
    farRidgeHighlight: { r: 125, g: 211, b: 252 },
    midHill: { r: 15, g: 118, b: 110 },    // #0F766E
    midHillStroke: { r: 15, g: 23, b: 42 },
    nearFoothill: { r: 21, g: 128, b: 61 }, // #15803D
    celestial: { r: 254, g: 240, b: 138 },  // #FEF08A
    celestialHalo: { r: 253, g: 224, b: 71 },
    celestialXRatio: 0.77,
    celestialYRatio: 0.19,
    starAlpha: 0,
    cloudFill: { r: 255, g: 255, b: 255 },
  },
  // 0.35: Vivid High-Altitude Midday (Stage 2 / Wave 2)
  {
    t: 0.35,
    skyTop: { r: 3, g: 105, b: 161 },       // #0369A1
    skyMid: { r: 14, g: 165, b: 233 },      // #0EA5E9
    skyBottom: { r: 125, g: 211, b: 252 },  // #7DD3FC
    farRidge: { r: 30, g: 64, b: 175 },     // #1E40AF
    farRidgeHighlight: { r: 147, g: 197, b: 253 },
    midHill: { r: 17, g: 94, b: 89 },       // #115E59
    midHillStroke: { r: 15, g: 23, b: 42 },
    nearFoothill: { r: 22, g: 101, b: 52 },
    celestial: { r: 253, g: 224, b: 71 },   // #FDE047
    celestialHalo: { r: 251, g: 191, b: 36 },
    celestialXRatio: 0.64,
    celestialYRatio: 0.14,
    starAlpha: 0,
    cloudFill: { r: 248, g: 250, b: 252 },
  },
  // 0.70: Golden Sunset Siege (Stage 3 / Wave 3)
  {
    t: 0.7,
    skyTop: { r: 49, g: 46, b: 129 },       // #312E81
    skyMid: { r: 234, g: 88, b: 12 },       // #EA580C
    skyBottom: { r: 253, g: 224, b: 71 },   // #FDE047
    farRidge: { r: 91, g: 33, b: 182 },     // #5B21B6
    farRidgeHighlight: { r: 251, g: 146, b: 60 },
    midHill: { r: 124, g: 45, b: 18 },      // #7C2D12
    midHillStroke: { r: 30, g: 27, b: 75 },
    nearFoothill: { r: 63, g: 98, b: 18 },  // #3F6212
    celestial: { r: 251, g: 146, b: 60 },   // #FB923C
    celestialHalo: { r: 249, g: 115, b: 22 },
    celestialXRatio: 0.42,
    celestialYRatio: 0.27,
    starAlpha: 0.22,
    cloudFill: { r: 255, g: 237, b: 213 },
  },
  // 1.00: Twilight Boss Arena (Stage 4 Boss / High Endless Waves)
  {
    t: 1,
    skyTop: { r: 20, g: 15, b: 45 },        // #140F2D (O.A.I. deep violet)
    skyMid: { r: 67, g: 56, b: 202 },       // #4338CA
    skyBottom: { r: 217, g: 119, b: 6 },    // #D97706 warm amber horizon
    farRidge: { r: 49, g: 46, b: 129 },     // #312E81
    farRidgeHighlight: { r: 129, g: 140, b: 248 },
    midHill: { r: 30, g: 41, b: 59 },       // #1E293B
    midHillStroke: { r: 15, g: 23, b: 42 },
    nearFoothill: { r: 20, g: 83, b: 45 },  // #14532D
    celestial: { r: 226, g: 232, b: 240 },  // Crisp moon glow
    celestialHalo: { r: 129, g: 140, b: 248 },
    celestialXRatio: 0.24,
    celestialYRatio: 0.18,
    starAlpha: 0.85,
    cloudFill: { r: 226, g: 232, b: 240 },
  },
];

export const PARALLAX_TILE_PERIOD = 1200;
export const PARALLAX_PROGRESS_TRAVEL = 480;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpRgb(a: RgbColor, b: RgbColor, t: number): string {
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `rgb(${r}, ${g}, ${bl})`;
}

function lerpRgba(a: RgbColor, b: RgbColor, t: number, alpha: number): string {
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `rgba(${r}, ${g}, ${bl}, ${alpha.toFixed(2)})`;
}

/**
 * Positive wrap modulo bounded strictly to [0, period) for both negative and positive offsets.
 */
export function getLayerWrapOffset(offset: number, period: number): number {
  if (period <= 0 || !Number.isFinite(offset)) return 0;
  const wrapped = ((offset % period) + period) % period;
  return wrapped === period ? 0 : wrapped;
}

/**
 * Computes normalized game progress in [0, 1] from current wave, maxWaves, tier, and score.
 * Title screen always stays at 0 so the launchpad sits over the bright blue morning sky.
 */
export function computeGameProgress(input: ParallaxProgressInput): number {
  if (input.screenState === 'title') {
    return 0;
  }

  const safeWave = Math.max(1, input.wave);
  let waveProgress = 0;

  if (input.maxWaves !== null && input.maxWaves > 1) {
    waveProgress = (safeWave - 1) / (input.maxWaves - 1);
  } else {
    // Endless mode smoothly progresses across waves 1..6 and beyond
    waveProgress = (safeWave - 1) / 5;
  }

  // Subtle boost from score and higher curriculum tier within a wave so progress feels continuous
  const scoreBoost = Math.min(0.18, Math.max(0, input.score) / 2800);
  const tierBoost = Math.max(0, (input.tier - 1) * 0.04);

  return clamp(waveProgress * 0.82 + scoreBoost + tierBoost, 0, 1);
}

/**
 * Creates the mutable parallax runtime state with deterministic multi-depth clouds and wind lanes.
 */
export function createParallaxState(
  initialWind: number = 0,
  initialProgress: number = 0
): ParallaxState {
  const clouds: ParallaxCloudSpec[] = [
    // Far high-altitude clouds (soft, slower)
    { baseX: 90, y: 66, scale: 0.54, speedFactor: 0.85, layer: 'far' },
    { baseX: 390, y: 102, scale: 0.48, speedFactor: 1.0, layer: 'far' },
    { baseX: 730, y: 74, scale: 0.6, speedFactor: 0.9, layer: 'far' },
    { baseX: 1050, y: 110, scale: 0.52, speedFactor: 1.05, layer: 'far' },
    // Near foreground-sky vector clouds (bold outlined, faster)
    { baseX: 160, y: 92, scale: 0.82, speedFactor: 0.95, layer: 'near' },
    { baseX: 470, y: 138, scale: 0.96, speedFactor: 1.15, layer: 'near' },
    { baseX: 780, y: 84, scale: 0.76, speedFactor: 1.0, layer: 'near' },
    { baseX: 1080, y: 132, scale: 0.92, speedFactor: 1.1, layer: 'near' },
    { baseX: 310, y: 166, scale: 0.72, speedFactor: 0.88, layer: 'near' },
    { baseX: 910, y: 164, scale: 0.86, speedFactor: 1.08, layer: 'near' },
  ];

  const streaks: WindStreakSpec[] = [
    { baseX: 120, y: 118, length: 68, speedFactor: 1.05, waveAmp: 4 },
    { baseX: 430, y: 185, length: 84, speedFactor: 1.25, waveAmp: 5 },
    { baseX: 760, y: 142, length: 62, speedFactor: 0.92, waveAmp: 3.5 },
    { baseX: 1020, y: 224, length: 76, speedFactor: 1.15, waveAmp: 4.5 },
    { baseX: 280, y: 268, length: 58, speedFactor: 0.88, waveAmp: 3 },
    { baseX: 890, y: 295, length: 72, speedFactor: 1.18, waveAmp: 4 },
  ];

  return {
    smoothWind: initialWind,
    smoothProgress: clamp(initialProgress, 0, 1),
    farCloudScroll: 0,
    nearCloudScroll: 0,
    windRibbonScroll: 0,
    windSwayOffset: 0,
    elapsedSec: 0,
    clouds,
    streaks,
  };
}

/**
 * Advances parallax state in-place using clamped dt.
 * Smoothly interpolates wind & progress and integrates directional wind scroll across layers.
 */
export function stepParallaxState(
  state: ParallaxState,
  targetWind: number,
  targetProgress: number,
  dt: number
): ParallaxState {
  const safeDt = clamp(dt, 0, 0.1);
  const clampedTargetProgress = clamp(targetProgress, 0, 1);

  // Smooth exponential damping for transitions between waves and wind shifts
  const windAlpha = 1 - Math.exp(-3.5 * safeDt);
  const progAlpha = 1 - Math.exp(-2.2 * safeDt);
  state.smoothWind += (targetWind - state.smoothWind) * windAlpha;
  state.smoothProgress += (clampedTargetProgress - state.smoothProgress) * progAlpha;

  state.elapsedSec += safeDt;

  // Base gentle breeze keeps sky alive even at 0 wind; windAccel drives speed & direction directly
  const baseBreeze = Math.abs(state.smoothWind) < 1 ? 6 : 0;
  const farCloudVel = baseBreeze * 0.55 + state.smoothWind * 0.45;
  const nearCloudVel = baseBreeze * 1.15 + state.smoothWind * 1.25;
  const ribbonVel = state.smoothWind * 3.1;

  state.farCloudScroll += farCloudVel * safeDt;
  state.nearCloudScroll += nearCloudVel * safeDt;
  state.windRibbonScroll += ribbonVel * safeDt;

  // Subtle sustained atmospheric camera parallax shift driven by wind pressure
  const targetWindSway = clamp(state.smoothWind * 0.45, -45, 45);
  state.windSwayOffset += (targetWindSway - state.windSwayOffset) * (1 - Math.exp(-2.4 * safeDt));

  return state;
}

/**
 * Computes per-layer horizontal parallax offsets combining game progress travel,
 * wind-driven drift/sway, and optional title screen camera pan.
 * Depth ordering guarantees: |farMountains| < |midHills| < |nearFoothills| for non-zero progress.
 */
export function computeParallaxOffsets(
  state: ParallaxState,
  titlePanX: number = 0
): ParallaxLayerOffsets {
  const progressShift = state.smoothProgress * PARALLAX_PROGRESS_TRAVEL;

  return {
    celestialX: -progressShift * 0.08 - state.windSwayOffset * 0.15 + titlePanX * 0.08,
    farMountainsX: -progressShift * 0.22 - state.windSwayOffset * 0.35 + titlePanX * 0.22,
    farCloudsX: state.farCloudScroll - progressShift * 0.32 + titlePanX * 0.3,
    midHillsX: -progressShift * 0.48 - state.windSwayOffset * 0.65 + titlePanX * 0.48,
    nearFoothillsX: -progressShift * 0.72 - state.windSwayOffset * 0.9 + titlePanX * 0.7,
    nearCloudsX: state.nearCloudScroll - progressShift * 0.62 + titlePanX * 0.65,
    windStreaksX: state.windRibbonScroll - progressShift * 0.85,
  };
}

/**
 * Interpolates vibrant sky, celestial, and mountain layer palette from normalized progress [0, 1].
 */
export function getSkyAtmosphere(progress: number): SkyAtmosphere {
  const p = clamp(progress, 0, 1);

  let lower = ATMOSPHERE_KEYFRAMES[0];
  let upper = ATMOSPHERE_KEYFRAMES[ATMOSPHERE_KEYFRAMES.length - 1];

  for (let i = 0; i < ATMOSPHERE_KEYFRAMES.length - 1; i++) {
    const curr = ATMOSPHERE_KEYFRAMES[i];
    const next = ATMOSPHERE_KEYFRAMES[i + 1];
    if (p >= curr.t && p <= next.t) {
      lower = curr;
      upper = next;
      break;
    }
  }

  const span = upper.t - lower.t;
  const localT = span > 0 ? clamp((p - lower.t) / span, 0, 1) : 0;

  return {
    skyTop: lerpRgb(lower.skyTop, upper.skyTop, localT),
    skyMid: lerpRgb(lower.skyMid, upper.skyMid, localT),
    skyBottom: lerpRgb(lower.skyBottom, upper.skyBottom, localT),
    farRidgeFill: lerpRgba(lower.farRidge, upper.farRidge, localT, 0.36),
    farRidgeHighlight: lerpRgba(lower.farRidgeHighlight, upper.farRidgeHighlight, localT, 0.22),
    midHillFill: lerpRgba(lower.midHill, upper.midHill, localT, 0.48),
    midHillStroke: lerpRgba(lower.midHillStroke, upper.midHillStroke, localT, 0.35),
    nearFoothillFill: lerpRgba(lower.nearFoothill, upper.nearFoothill, localT, 0.56),
    celestialColor: lerpRgb(lower.celestial, upper.celestial, localT),
    celestialHalo: lerpRgba(lower.celestialHalo, upper.celestialHalo, localT, 0.28),
    celestialXRatio: lerp(lower.celestialXRatio, upper.celestialXRatio, localT),
    celestialYRatio: lerp(lower.celestialYRatio, upper.celestialYRatio, localT),
    starAlpha: Number(lerp(lower.starAlpha, upper.starAlpha, localT).toFixed(3)),
    cloudFill: lerpRgb(lower.cloudFill, upper.cloudFill, localT),
    farCloudAlpha: Number(lerp(0.58, 0.42, p).toFixed(2)),
  };
}
