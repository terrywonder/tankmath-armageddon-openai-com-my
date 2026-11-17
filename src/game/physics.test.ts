import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyBlastDamage,
  carveCrater,
  createProjectile,
  generateTerrain,
  getTerrainY,
  previewTrajectory,
  solveEnemyBallistics,
  stepProjectile,
} from './physics';
import type { TankEntity } from './types';

function makeTank(overrides: Partial<TankEntity> = {}): TankEntity {
  return {
    id: 't1',
    name: 'Test Tank',
    isPlayer: true,
    x: 160,
    y: 420,
    vx: 0,
    angleDeg: 45,
    power: 70,
    hp: 100,
    maxHp: 100,
    shield: 0,
    color: '#2563EB',
    accentColor: '#60A5FA',
    hitFlashTimer: 0,
    koTimer: 0,
    isAlive: true,
    facing: 1,
    ...overrides,
  };
}

test('generateTerrain creates bounded heightmap and carveCrater lowers ground', () => {
  const terrain = generateTerrain(1200, 640, 2, 80);
  assert.equal(terrain.length, 1200);
  const before = getTerrainY(terrain, 500);
  assert.ok(before > 100 && before < 620);

  carveCrater(terrain, 500, before, 45);
  const after = getTerrainY(terrain, 500);
  assert.ok(after > before, 'Crater should push terrain Y downward');
});

test('projectile ballistic step moves under gravity and wind', () => {
  const tank = makeTank();
  const proj = createProjectile({
    tank,
    angleDeg: 45,
    power: 75,
    damage: 38,
    blastRadius: 45,
    color: '#F59E0B',
    isAccurate: true,
  });
  const startX = proj.x;
  const startVy = proj.vy;
  stepProjectile(proj, 50, 0.05);
  assert.ok(proj.x > startX);
  assert.ok(proj.vy > startVy, 'Gravity increases downward velocity');
});

test('applyBlastDamage damages tanks within blast radius and handles KO', () => {
  const enemy = makeTank({ id: 'e1', isPlayer: false, x: 800, y: 400, hp: 30, maxHp: 60 });
  const hits = applyBlastDamage([enemy], 805, 392, 48, 40);
  assert.equal(hits.length, 1);
  assert.ok(hits[0].damage >= 25);
  assert.equal(enemy.hp, 0);
  assert.equal(enemy.isAlive, false);
  assert.ok(enemy.koTimer > 0);
});

test('previewTrajectory returns arc points and solveEnemyBallistics aims toward player', () => {
  const player = makeTank({ x: 180, y: 430 });
  const enemy = makeTank({ id: 'e1', isPlayer: false, x: 920, y: 410, facing: -1 });
  const arc = previewTrajectory(player, 0, 18, 0.05);
  assert.equal(arc.length, 18);
  assert.ok(arc[arc.length - 1].x > player.x);

  const solution = solveEnemyBallistics({
    enemy,
    target: player,
    windAccel: 0,
    archetype: 'scout',
    wave: 2,
    rng: () => 0.5,
  });
  assert.ok(solution.angleDeg > 90 && solution.angleDeg < 165, 'Enemy should aim left toward player');
  assert.ok(solution.power >= 25 && solution.power <= 98);
});
