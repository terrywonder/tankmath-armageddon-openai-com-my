import React, { useEffect, useRef } from 'react';
import { QUALITY_PRESETS, WORLD_HEIGHT, WORLD_WIDTH } from '../game/constants';
import { getMuzzlePosition, getTerrainY, previewTrajectory } from '../game/physics';
import type {
  FloatingText,
  GameScreenState,
  ProjectileEntity,
  QualityTier,
  TankEntity,
} from '../game/types';

export interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  gravity: number;
}

export interface BattlefieldSimulationState {
  screenState: GameScreenState;
  terrain: Float32Array;
  terrainDirty: boolean;
  tanks: TankEntity[];
  projectiles: ProjectileEntity[];
  particles: Particle[];
  particleCursor: number;
  floatingTexts: FloatingText[];
  windAccel: number;
  hitstopTimer: number;
  shakeTrauma: number;
  recoilOffset: number;
  arcPoints: number;
  canPlayerAim: boolean;
  enemyTelegraphTimer: number;
  enemyTelegraphTankId: string | null;
}

interface BattlefieldCanvasProps {
  simRef: React.MutableRefObject<BattlefieldSimulationState>;
  qualityTier: QualityTier;
  onAimChange: (angleDeg: number, power: number) => void;
  onStepSimulation: (dt: number) => void;
}

const MAX_PARTICLES = 80;

function computeBattlefieldTransform(
  logicalWidth: number,
  logicalHeight: number,
  screenState: GameScreenState
) {
  const safeW = Math.max(320, logicalWidth);
  const safeH = Math.max(240, logicalHeight);
  const scaleX = safeW / WORLD_WIDTH;
  const scaleY = safeH / WORLD_HEIGHT;

  if (screenState !== 'playing') {
    const scale = safeW < safeH ? scaleX : Math.max(scaleX, scaleY);
    return {
      scale,
      offsetX: (safeW - WORLD_WIDTH * scale) * 0.5,
      offsetY:
        safeW < safeH
          ? (safeH - WORLD_HEIGHT * scale) * 0.42
          : (safeH - WORLD_HEIGHT * scale) * 0.5,
    };
  }

  const topInset = safeH < 480 ? 44 : 62;
  const bottomInset =
    safeH < 480
      ? Math.min(104, Math.round(safeH * 0.28))
      : safeW < 768
        ? Math.min(175, Math.round(safeH * 0.28))
        : 128;
  const availHeight = Math.max(120, safeH - topInset - bottomInset);
  const compactViewport = safeW < 1024 || safeH < 560;
  const playScaleY = availHeight / (WORLD_HEIGHT * 0.78);
  const scale = compactViewport
    ? Math.min(scaleX, playScaleY)
    : Math.min(scaleX, Math.max(playScaleY, availHeight / WORLD_HEIGHT));
  const offsetX = (safeW - WORLD_WIDTH * scale) * 0.5;
  const playBottom = safeH - bottomInset;
  const offsetY = playBottom - 595 * scale;

  return { scale, offsetX, offsetY };
}

export function createParticlePool(): Particle[] {
  return Array.from({ length: MAX_PARTICLES }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    radius: 3,
    color: '#F59E0B',
    life: 0,
    maxLife: 1,
    gravity: 200,
  }));
}

export function spawnParticles(
  sim: BattlefieldSimulationState,
  x: number,
  y: number,
  count: number,
  colors: string[],
  speedMin: number,
  speedMax: number,
  radiusMin: number,
  radiusMax: number,
  gravity: number = 220
) {
  for (let i = 0; i < count; i++) {
    const p = sim.particles[sim.particleCursor];
    sim.particleCursor = (sim.particleCursor + 1) % MAX_PARTICLES;
    const angle = Math.random() * Math.PI * 2;
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    p.active = true;
    p.x = x;
    p.y = y;
    p.vx = Math.cos(angle) * speed;
    p.vy = Math.sin(angle) * speed - 40;
    p.radius = radiusMin + Math.random() * (radiusMax - radiusMin);
    p.color = colors[i % colors.length];
    p.maxLife = 0.35 + Math.random() * 0.45;
    p.life = p.maxLife;
    p.gravity = gravity;
  }
}

export const BattlefieldCanvas: React.FC<BattlefieldCanvasProps> = ({
  simRef,
  qualityTier,
  onAimChange,
  onStepSimulation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const terrainBufferRef = useRef<HTMLCanvasElement | null>(null);
  const qualityRef = useRef<QualityTier>(qualityTier);
  const onAimRef = useRef(onAimChange);
  const onStepRef = useRef(onStepSimulation);
  const draggingRef = useRef(false);

  qualityRef.current = qualityTier;
  onAimRef.current = onAimChange;
  onStepRef.current = onStepSimulation;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const offscreen = document.createElement('canvas');
    offscreen.width = WORLD_WIDTH;
    offscreen.height = WORLD_HEIGHT;
    terrainBufferRef.current = offscreen;

    let animId = 0;
    let lastTime = performance.now();
    let logicalWidth = canvas.clientWidth || 1200;
    let logicalHeight = canvas.clientHeight || 640;
    let cachedSkyGrad: CanvasGradient | null = null;
    let cachedSkyHeight = 0;

    const updateSize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const preset = QUALITY_PRESETS[qualityRef.current];
      const dpr =
        qualityRef.current === 'eco'
          ? 0.75
          : Math.min(window.devicePixelRatio || 1, preset.maxDpr);
      logicalWidth = rect.width;
      logicalHeight = rect.height;
      const targetW = Math.max(320, Math.round(rect.width * dpr));
      const targetH = Math.max(240, Math.round(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      if (!cachedSkyGrad || cachedSkyHeight !== logicalHeight) {
        cachedSkyGrad = ctx.createLinearGradient(0, 0, 0, logicalHeight);
        cachedSkyGrad.addColorStop(0, '#0284C7');
        cachedSkyGrad.addColorStop(0.55, '#38BDF8');
        cachedSkyGrad.addColorStop(1, '#BAE6FD');
        cachedSkyHeight = logicalHeight;
      }
    };

    const onOrientationResize = () => {
      updateSize();
      window.setTimeout(updateSize, 120);
      window.setTimeout(updateSize, 320);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });
    resizeObserver.observe(canvas);
    window.addEventListener('resize', onOrientationResize);
    window.addEventListener('orientationchange', onOrientationResize);
    updateSize();

    const rebuildTerrainBitmap = (terrain: Float32Array) => {
      const tCtx = offscreen.getContext('2d');
      if (!tCtx) return;
      tCtx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Base Earth Fill
      tCtx.beginPath();
      tCtx.moveTo(0, WORLD_HEIGHT);
      for (let x = 0; x < WORLD_WIDTH; x++) {
        tCtx.lineTo(x, terrain[x]);
      }
      tCtx.lineTo(WORLD_WIDTH, WORLD_HEIGHT);
      tCtx.closePath();

      const earthGrad = tCtx.createLinearGradient(0, WORLD_HEIGHT * 0.45, 0, WORLD_HEIGHT);
      earthGrad.addColorStop(0, '#92400E');
      earthGrad.addColorStop(0.5, '#78350F');
      earthGrad.addColorStop(1, '#451A03');
      tCtx.fillStyle = earthGrad;
      tCtx.fill();

      // Mid Turf Band
      tCtx.beginPath();
      tCtx.moveTo(0, terrain[0]);
      for (let x = 0; x < WORLD_WIDTH; x++) {
        tCtx.lineTo(x, terrain[x]);
      }
      for (let x = WORLD_WIDTH - 1; x >= 0; x--) {
        tCtx.lineTo(x, terrain[x] + 22);
      }
      tCtx.closePath();
      tCtx.fillStyle = '#15803D';
      tCtx.fill();

      // Top Grass Lip (Worms Armageddon bright green vector turf)
      tCtx.beginPath();
      tCtx.moveTo(0, terrain[0]);
      for (let x = 0; x < WORLD_WIDTH; x++) {
        tCtx.lineTo(x, terrain[x]);
      }
      for (let x = WORLD_WIDTH - 1; x >= 0; x--) {
        tCtx.lineTo(x, terrain[x] + 11);
      }
      tCtx.closePath();
      tCtx.fillStyle = '#4ADE80';
      tCtx.fill();

      // Bold Dark Vector Ink Outline on top ridge
      tCtx.beginPath();
      tCtx.moveTo(0, terrain[0]);
      for (let x = 0; x < WORLD_WIDTH; x += 2) {
        tCtx.lineTo(x, terrain[x]);
      }
      tCtx.lineWidth = 3.5;
      tCtx.strokeStyle = '#0F172A';
      tCtx.stroke();

      // Subtle earth vector pebbles for texture (deterministic positions)
      tCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      for (let i = 0; i < 45; i++) {
        const px = (i * 97 + 41) % WORLD_WIDTH;
        const ground = terrain[px];
        const py = ground + 34 + ((i * 53) % 120);
        if (py < WORLD_HEIGHT - 10) {
          tCtx.beginPath();
          tCtx.ellipse(px, py, 7 + (i % 6), 4 + (i % 3), 0.2, 0, Math.PI * 2);
          tCtx.fill();
        }
      }
    };

    const drawVectorCloud = (x: number, y: number, scale: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 22, Math.PI * 0.5, Math.PI * 1.5);
      ctx.arc(24, -12, 26, Math.PI * 1, Math.PI * 1.9);
      ctx.arc(54, -4, 20, Math.PI * 1.2, Math.PI * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    };

    const drawTank = (tank: TankEntity, timeSec: number, recoil: number, isTelegraphing: boolean) => {
      if (!tank.isAlive && tank.koTimer <= 0) return;

      const koProgress = tank.isAlive ? 0 : 1 - Math.max(0, tank.koTimer / 0.45);
      ctx.save();
      ctx.translate(tank.x, tank.y + koProgress * 18);
      if (!tank.isAlive) {
        ctx.rotate(koProgress * (tank.isPlayer ? -0.45 : 0.45));
        ctx.globalAlpha = Math.max(0, 1 - koProgress);
      }

      const isHitFlash = tank.hitFlashTimer > 0;
      const hullColor = isHitFlash ? '#FFFFFF' : tank.color;
      const accentColor = isHitFlash ? '#FFFFFF' : tank.accentColor;

      // Telegraph ring for enemy about to fire
      if (isTelegraphing && tank.isAlive) {
        const pulse = 0.5 + 0.5 * Math.sin(timeSec * 16);
        ctx.save();
        ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + pulse * 0.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -14, 34 + pulse * 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Barrel
      const rad = (tank.angleDeg * Math.PI) / 180;
      const recoilDist = tank.isPlayer ? recoil * 6 : 0;
      ctx.save();
      ctx.translate(0, -16);
      ctx.rotate(-rad);
      ctx.translate(-recoilDist, 0);
      ctx.fillStyle = '#334155';
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(0, -4.5, 30, 9, 3);
      ctx.fill();
      ctx.stroke();
      // Muzzle tip
      ctx.fillStyle = accentColor;
      ctx.beginPath();
      ctx.roundRect(24, -6, 7, 12, 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Turret Dome
      ctx.fillStyle = accentColor;
      ctx.strokeStyle = '#0F172A';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -14, 14, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Main Hull
      ctx.fillStyle = hullColor;
      ctx.beginPath();
      ctx.roundRect(-22, -14, 44, 12, 5);
      ctx.fill();
      ctx.stroke();

      // Treads
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.roundRect(-26, -5, 52, 11, 5.5);
      ctx.fill();
      ctx.stroke();

      // Road wheels
      ctx.fillStyle = '#94A3B8';
      for (const wx of [-16, -5, 6, 17]) {
        ctx.beginPath();
        ctx.arc(wx, 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Archetype insignia on hull
      ctx.fillStyle = '#FDE047';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const emblem = tank.isPlayer
        ? '+'
        : tank.archetype === 'boss'
          ? '★'
          : tank.archetype === 'mortar'
            ? '▲'
            : '×';
      ctx.fillText(emblem, 0, -8);

      // Overhead Name & HP Bar (only during active gameplay)
      if (tank.isAlive && simRef.current.screenState !== 'title') {
        const barW = 46;
        const barH = 6;
        const hpRatio = Math.max(0, Math.min(1, tank.hp / tank.maxHp));
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.roundRect(-barW / 2 - 1, -44, barW + 2, barH + 2, 3);
        ctx.fill();

        ctx.fillStyle = tank.isPlayer ? '#22C55E' : '#EF4444';
        if (hpRatio > 0) {
          ctx.beginPath();
          ctx.roundRect(-barW / 2, -43, barW * hpRatio, barH, 2);
          ctx.fill();
        }

        // Shield bar if boss has shield
        if (tank.shield > 0) {
          ctx.fillStyle = '#38BDF8';
          ctx.beginPath();
          ctx.roundRect(-barW / 2, -49, barW * Math.min(1, tank.shield / 40), 3, 1.5);
          ctx.fill();
        }

        ctx.font = '700 10px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#0F172A';
        ctx.fillText(`${tank.hp}`, 1, -52);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`${tank.hp}`, 0, -53);
      }

      ctx.restore();
    };

    let lastQuality = qualityRef.current;
    let pendingTimer: number | null = null;
    const scheduleNext = (delayMs: number) => {
      if (delayMs > 0) {
        pendingTimer = window.setTimeout(() => {
          pendingTimer = null;
          animId = requestAnimationFrame(renderFrame);
        }, delayMs);
      } else {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    const renderFrame = (now: number) => {
      const frameStart = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      const sim = simRef.current;
      if (lastQuality !== qualityRef.current) {
        lastQuality = qualityRef.current;
        updateSize();
      }
      const preset = QUALITY_PRESETS[qualityRef.current];

      // Step simulation
      if (sim.screenState === 'playing') {
        onStepRef.current(dt);
      }

      // Tick particles & floating texts in real dt even during hitstop
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = sim.particles[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
      for (let i = sim.floatingTexts.length - 1; i >= 0; i--) {
        const ft = sim.floatingTexts[i];
        ft.life -= dt;
        ft.y += ft.vy * dt;
        if (ft.life <= 0) sim.floatingTexts.splice(i, 1);
      }
      for (const tank of sim.tanks) {
        if (tank.hitFlashTimer > 0) tank.hitFlashTimer = Math.max(0, tank.hitFlashTimer - dt);
        if (!tank.isAlive && tank.koTimer > 0) tank.koTimer = Math.max(0, tank.koTimer - dt);
        if (tank.isAlive) {
          const groundY = getTerrainY(sim.terrain, tank.x);
          if (tank.y < groundY) {
            tank.y = Math.min(groundY, tank.y + 180 * dt);
          } else {
            tank.y = groundY;
          }
        }
      }
      if (sim.shakeTrauma > 0) sim.shakeTrauma = Math.max(0, sim.shakeTrauma - dt * 2.2);
      if (sim.recoilOffset > 0) sim.recoilOffset = Math.max(0, sim.recoilOffset - dt * 5);

      if (sim.terrainDirty) {
        rebuildTerrainBitmap(sim.terrain);
        sim.terrainDirty = false;
      }

      // Fit full battlefield width on portrait/mobile and reserve HUD insets cleanly
      const dpr =
        qualityRef.current === 'eco'
          ? 0.75
          : Math.min(window.devicePixelRatio || 1, preset.maxDpr);
      const { scale, offsetX, offsetY } = computeBattlefieldTransform(
        logicalWidth,
        logicalHeight,
        sim.screenState
      );

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Vibrant Worms Armageddon Sky Gradient (cached)
      ctx.fillStyle = cachedSkyGrad || '#38BDF8';
      ctx.fillRect(0, 0, logicalWidth, logicalHeight);

      // Extend earth fill below WORLD_HEIGHT on portrait mobile screens
      if (offsetY + WORLD_HEIGHT * scale < logicalHeight) {
        ctx.fillStyle = '#451A03';
        ctx.fillRect(
          0,
          offsetY + WORLD_HEIGHT * scale - 2,
          logicalWidth,
          logicalHeight - (offsetY + WORLD_HEIGHT * scale) + 4
        );
      }

      // Title screen gentle camera drift
      const timeSec = now / 1000;
      const titlePanX = sim.screenState === 'title' ? Math.sin(timeSec * 0.35) * 18 : 0;
      const shakeMag = sim.shakeTrauma * sim.shakeTrauma * 14;
      const shakeX = shakeMag > 0.1 ? (Math.random() - 0.5) * shakeMag : 0;
      const shakeY = shakeMag > 0.1 ? (Math.random() - 0.5) * shakeMag : 0;

      ctx.translate(offsetX + titlePanX + shakeX, offsetY + shakeY);
      ctx.scale(scale, scale);

      // Distant Vector Mountains (disabled in Eco mode for low-end specs)
      if (preset.showMountains) {
        ctx.fillStyle = 'rgba(14, 116, 144, 0.28)';
        ctx.beginPath();
        ctx.moveTo(-80, WORLD_HEIGHT);
        ctx.lineTo(120, 320);
        ctx.lineTo(310, 420);
        ctx.lineTo(540, 270);
        ctx.lineTo(780, 400);
        ctx.lineTo(1010, 290);
        ctx.lineTo(1280, 440);
        ctx.lineTo(1280, WORLD_HEIGHT);
        ctx.closePath();
        ctx.fill();
      }

      // Drifting Vector Clouds
      for (let i = 0; i < preset.cloudsCount; i++) {
        const cx = ((i * 250 + timeSec * (12 + (i % 3) * 5) + sim.windAccel * 0.25) % (WORLD_WIDTH + 220)) - 110;
        const cy = 75 + (i % 3) * 46;
        drawVectorCloud(cx, cy, 0.72 + (i % 2) * 0.25);
      }

      // Draw pre-rendered destructible terrain bitmap
      ctx.drawImage(offscreen, 0, 0);

      // Trajectory Preview Arc for Player
      const player = sim.tanks.find((t) => t.isPlayer);
      if (player && player.isAlive && sim.canPlayerAim && sim.screenState === 'playing') {
        const pts = previewTrajectory(player, sim.windAccel, sim.arcPoints, 0.048);
        for (let i = 0; i < pts.length; i++) {
          const alpha = Math.max(0.15, 1 - i / pts.length);
          ctx.fillStyle = `rgba(253, 224, 71, ${alpha})`;
          ctx.strokeStyle = `rgba(15, 23, 42, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(pts[i].x, pts[i].y, i === 0 ? 4.5 : 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }

        // Reticle at muzzle direction
        const muzzle = getMuzzlePosition(player);
        const rad = (player.angleDeg * Math.PI) / 180;
        const rx = muzzle.x + Math.cos(rad) * 32;
        const ry = muzzle.y - Math.sin(rad) * 32;
        ctx.strokeStyle = '#FDE047';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(rx, ry, 7, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw Tanks
      for (const tank of sim.tanks) {
        drawTank(
          tank,
          timeSec,
          tank.isPlayer ? sim.recoilOffset : 0,
          sim.enemyTelegraphTimer > 0 && sim.enemyTelegraphTankId === tank.id
        );
      }

      // Draw Active Projectiles
      for (const proj of sim.projectiles) {
        if (!proj.active) continue;
        ctx.fillStyle = proj.color;
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, proj.radius + 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Bright core
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.arc(proj.x - 1, proj.y - 1, proj.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Pooled Particles
      const maxDrawParticles = Math.min(MAX_PARTICLES, preset.maxParticles);
      for (let i = 0; i < maxDrawParticles; i++) {
        const p = sim.particles[i];
        if (!p.active) continue;
        const alpha = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * (0.4 + alpha * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Floating Damage / Math Bonus Popups
      for (const ft of sim.floatingTexts) {
        const alpha = Math.min(1, ft.life / (ft.maxLife * 0.5));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `800 ${Math.round(16 * ft.scale)}px "Bricolage Grotesque", sans-serif`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#0F172A';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();
      const renderCostMs = performance.now() - frameStart;
      const hasAction =
        sim.projectiles.some((p) => p.active) ||
        sim.floatingTexts.length > 0 ||
        sim.shakeTrauma > 0 ||
        sim.recoilOffset > 0 ||
        sim.enemyTelegraphTimer > 0 ||
        draggingRef.current;

      // Full frame rate during action; gentle 20fps idle drift to save CPU/battery on all specs
      const delay = hasAction ? (renderCostMs > 14 ? 16 : 0) : 45;
      scheduleNext(delay);
    };

    animId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(animId);
      if (pendingTimer !== null) clearTimeout(pendingTimer);
      resizeObserver.disconnect();
      window.removeEventListener('resize', onOrientationResize);
      window.removeEventListener('orientationchange', onOrientationResize);
    };
  }, [simRef]);

  const screenToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    const { scale, offsetX, offsetY } = computeBattlefieldTransform(
      rect.width,
      rect.height,
      simRef.current.screenState
    );
    return {
      x: (clientX - rect.left - offsetX) / scale,
      y: (clientY - rect.top - offsetY) / scale,
    };
  };

  const applyPointerAim = (clientX: number, clientY: number) => {
    const sim = simRef.current;
    if (sim.screenState !== 'playing' || !sim.canPlayerAim) return;
    const player = sim.tanks.find((t) => t.isPlayer);
    if (!player || !player.isAlive) return;
    const pt = screenToWorld(clientX, clientY);
    if (!pt) return;

    const dx = pt.x - player.x;
    const dy = (player.y - 16) - pt.y;
    // Allow aiming in forward arc 5°..165°
    const rawDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const angleDeg = Math.max(5, Math.min(165, Math.round(rawDeg)));
    const dist = Math.hypot(dx, dy);
    const power = Math.max(20, Math.min(100, Math.round((dist / 360) * 100)));
    onAimRef.current(angleDeg, power);
  };

  return (
    <canvas
      ref={canvasRef}
      data-testid="battlefield-canvas"
      aria-label="TankMath Artillery Battlefield"
      onPointerDown={(e) => {
        if (simRef.current.screenState !== 'playing' || !simRef.current.canPlayerAim) return;
        draggingRef.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        applyPointerAim(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (!draggingRef.current) return;
        applyPointerAim(e.clientX, e.clientY);
      }}
      onPointerUp={(e) => {
        draggingRef.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      className="block h-full w-full touch-none select-none cursor-crosshair"
    />
  );
};
