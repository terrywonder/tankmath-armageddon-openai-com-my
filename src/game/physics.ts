import { GRAVITY, WORLD_HEIGHT, WORLD_WIDTH } from './constants';
import type { EnemyArchetype, ProjectileEntity, TankEntity } from './types';

export function generateTerrain(
  width: number = WORLD_WIDTH,
  height: number = WORLD_HEIGHT,
  seed: number = 1,
  hillAmplitude: number = 95
): Float32Array {
  const terrain = new Float32Array(width);
  const baseLine = height * 0.72;
  const p1 = (seed * 1.73) % (Math.PI * 2);
  const p2 = (seed * 3.19) % (Math.PI * 2);
  const p3 = (seed * 0.87) % (Math.PI * 2);

  for (let x = 0; x < width; x++) {
    const nx = x / width;
    const h =
      Math.sin(nx * Math.PI * 2.4 + p1) * (hillAmplitude * 0.55) +
      Math.sin(nx * Math.PI * 5.2 + p2) * (hillAmplitude * 0.28) +
      Math.cos(nx * Math.PI * 9.0 + p3) * (hillAmplitude * 0.12);

    // Raise central ridge slightly for artillery arcing, keep edges fair
    const centerBump = Math.exp(-Math.pow((nx - 0.5) / 0.24, 2)) * (hillAmplitude * 0.45);
    const y = Math.min(height - 56, Math.max(height * 0.36, baseLine - h - centerBump));
    terrain[x] = y;
  }

  // Flatten player spawn pad around x = 160 and enemy pads around x = 780..1040
  flattenPad(terrain, 160, 56);
  flattenPad(terrain, 820, 48);
  flattenPad(terrain, 990, 48);

  return terrain;
}

function flattenPad(terrain: Float32Array, centerX: number, halfWidth: number) {
  const cx = Math.max(0, Math.min(terrain.length - 1, Math.round(centerX)));
  const targetY = terrain[cx];
  const start = Math.max(0, cx - halfWidth);
  const end = Math.min(terrain.length - 1, cx + halfWidth);
  for (let x = start; x <= end; x++) {
    const dist = Math.abs(x - cx) / halfWidth;
    const blend = dist < 0.6 ? 1 : 1 - (dist - 0.6) / 0.4;
    terrain[x] = terrain[x] * (1 - blend) + targetY * blend;
  }
}

export function getTerrainY(terrain: Float32Array, x: number): number {
  const ix = Math.max(0, Math.min(terrain.length - 1, Math.round(x)));
  return terrain[ix];
}

export function carveCrater(
  terrain: Float32Array,
  cx: number,
  cy: number,
  radius: number,
  maxDepthY: number = WORLD_HEIGHT - 24
): void {
  const startX = Math.max(0, Math.floor(cx - radius));
  const endX = Math.min(terrain.length - 1, Math.ceil(cx + radius));

  for (let x = startX; x <= endX; x++) {
    const dx = x - cx;
    const inside = radius * radius - dx * dx;
    if (inside <= 0) continue;
    const craterBottom = cy + Math.sqrt(inside);
    if (craterBottom > terrain[x]) {
      terrain[x] = Math.min(maxDepthY, craterBottom);
    }
  }
}

export function powerToSpeed(power: number): number {
  return 260 + (Math.max(15, Math.min(100, power)) / 100) * 520;
}

export function getMuzzlePosition(tank: TankEntity): { x: number; y: number } {
  const rad = (tank.angleDeg * Math.PI) / 180;
  const barrelLen = 30;
  return {
    x: tank.x + Math.cos(rad) * barrelLen,
    y: tank.y - 16 - Math.sin(rad) * barrelLen,
  };
}

export function createProjectile(params: {
  tank: TankEntity;
  angleDeg: number;
  power: number;
  damage: number;
  blastRadius: number;
  color: string;
  isAccurate: boolean;
}): ProjectileEntity {
  const rad = (params.angleDeg * Math.PI) / 180;
  const speed = powerToSpeed(params.power);
  const muzzle = getMuzzlePosition({ ...params.tank, angleDeg: params.angleDeg });
  return {
    active: true,
    x: muzzle.x,
    y: muzzle.y,
    vx: Math.cos(rad) * speed,
    vy: -Math.sin(rad) * speed,
    radius: 5,
    damage: params.damage,
    blastRadius: params.blastRadius,
    color: params.color,
    fromPlayer: params.tank.isPlayer,
    isAccurate: params.isAccurate,
    trailTimer: 0,
  };
}

export function stepProjectile(
  proj: ProjectileEntity,
  windAccel: number,
  dt: number
): void {
  proj.vx += windAccel * dt;
  proj.vy += GRAVITY * dt;
  proj.x += proj.vx * dt;
  proj.y += proj.vy * dt;
}

export function previewTrajectory(
  tank: TankEntity,
  windAccel: number,
  steps: number = 22,
  stepDt: number = 0.045
): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const rad = (tank.angleDeg * Math.PI) / 180;
  const speed = powerToSpeed(tank.power);
  const muzzle = getMuzzlePosition(tank);
  let x = muzzle.x;
  let y = muzzle.y;
  let vx = Math.cos(rad) * speed;
  let vy = -Math.sin(rad) * speed;

  for (let i = 0; i < steps; i++) {
    vx += windAccel * stepDt;
    vy += GRAVITY * stepDt;
    x += vx * stepDt;
    y += vy * stepDt;
    if (x < 0 || x > WORLD_WIDTH || y > WORLD_HEIGHT) break;
    pts.push({ x, y });
  }
  return pts;
}

export function applyBlastDamage(
  tanks: TankEntity[],
  impactX: number,
  impactY: number,
  blastRadius: number,
  maxDamage: number
): Array<{ tankId: string; damage: number; defeated: boolean }> {
  const hits: Array<{ tankId: string; damage: number; defeated: boolean }> = [];

  for (const tank of tanks) {
    if (!tank.isAlive) continue;
    const centerY = tank.y - 12;
    const dx = tank.x - impactX;
    const dy = centerY - impactY;
    const dist = Math.hypot(dx, dy);

    if (dist <= blastRadius + 20) {
      const falloff = Math.max(0.25, 1 - dist / (blastRadius + 24));
      let rawDmg = Math.round(maxDamage * falloff);
      if (tank.shield > 0) {
        const absorbed = Math.min(tank.shield, Math.round(rawDmg * 0.5));
        tank.shield -= absorbed;
        rawDmg -= absorbed;
      }
      tank.hp = Math.max(0, tank.hp - rawDmg);
      tank.hitFlashTimer = 0.14;
      const defeated = tank.hp <= 0;
      if (defeated) {
        tank.isAlive = false;
        tank.koTimer = 0.45;
      }
      hits.push({ tankId: tank.id, damage: rawDmg, defeated });
    }
  }

  return hits;
}

export function solveEnemyBallistics(params: {
  enemy: TankEntity;
  target: TankEntity;
  windAccel: number;
  archetype: EnemyArchetype;
  wave: number;
  rng?: () => number;
}): { angleDeg: number; power: number } {
  const { enemy, target, windAccel, archetype, wave, rng = Math.random } = params;
  const dx = target.x - enemy.x; // negative if target is to the left
  const dy = (target.y - 12) - (enemy.y - 16);

  // Choose base elevation angle facing target
  const baseElevation = archetype === 'mortar' ? 62 : archetype === 'boss' ? 48 : 44;
  const angleDeg = dx < 0 ? 180 - baseElevation : baseElevation;
  const rad = (angleDeg * Math.PI) / 180;

  // Search power 25..98 that minimizes landing distance near target.x
  let bestPower = 60;
  let bestErr = Infinity;

  for (let p = 25; p <= 98; p += 2) {
    const speed = powerToSpeed(p);
    let x = enemy.x + Math.cos(rad) * 30;
    let y = enemy.y - 16 - Math.sin(rad) * 30;
    let vx = Math.cos(rad) * speed;
    let vy = -Math.sin(rad) * speed;

    for (let t = 0; t < 3.5; t += 0.03) {
      vx += windAccel * 0.03;
      vy += GRAVITY * 0.03;
      x += vx * 0.03;
      y += vy * 0.03;
      if (vy > 0 && y >= target.y - 12 + dy * 0) {
        const err = Math.abs(x - target.x);
        if (err < bestErr) {
          bestErr = err;
          bestPower = p;
        }
        break;
      }
    }
  }

  // Fair educational scatter so player isn't sniped unfairly on early waves
  const maxScatter = Math.max(4, 15 - wave * 1.4 - (archetype === 'boss' ? 3 : 0));
  const powerJitter = (rng() - 0.5) * 2 * maxScatter;
  const angleJitter = (rng() - 0.5) * 4;

  return {
    angleDeg: Math.max(15, Math.min(165, Math.round(angleDeg + angleJitter))),
    power: Math.max(25, Math.min(98, Math.round(bestPower + powerJitter))),
  };
}
