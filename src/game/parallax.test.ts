import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PARALLAX_TILE_PERIOD,
  computeGameProgress,
  computeParallaxOffsets,
  createParallaxState,
  getLayerWrapOffset,
  getSkyAtmosphere,
  stepParallaxState,
} from './parallax';

test('computeGameProgress returns 0 on title screen and increases monotonically with wave and score', () => {
  const titleProgress = computeGameProgress({
    screenState: 'title',
    mode: 'tutorial',
    wave: 3,
    maxWaves: 4,
    tier: 4,
    score: 2000,
  });
  assert.equal(titleProgress, 0);

  const wave1 = computeGameProgress({
    screenState: 'playing',
    mode: 'tutorial',
    wave: 1,
    maxWaves: 4,
    tier: 1,
    score: 0,
  });
  const wave2 = computeGameProgress({
    screenState: 'playing',
    mode: 'tutorial',
    wave: 2,
    maxWaves: 4,
    tier: 2,
    score: 350,
  });
  const wave4 = computeGameProgress({
    screenState: 'playing',
    mode: 'tutorial',
    wave: 4,
    maxWaves: 4,
    tier: 4,
    score: 1400,
  });

  assert.equal(wave1, 0);
  assert.ok(wave2 > wave1, `expected wave2 (${wave2}) > wave1 (${wave1})`);
  assert.ok(wave4 > wave2, `expected wave4 (${wave4}) > wave2 (${wave2})`);
  assert.ok(wave4 <= 1, 'progress must clamp at 1');

  const endlessLate = computeGameProgress({
    screenState: 'playing',
    mode: 'endless',
    wave: 12,
    maxWaves: null,
    tier: 5,
    score: 8000,
  });
  assert.equal(endlessLate, 1);
});

test('stepParallaxState shifts clouds and wind ribbons proportionally to wind speed and direction', () => {
  const calm = createParallaxState(0, 0);
  const rightWind = createParallaxState(60, 0);
  const leftWind = createParallaxState(-60, 0);

  for (let i = 0; i < 20; i++) {
    stepParallaxState(calm, 0, 0, 0.05);
    stepParallaxState(rightWind, 60, 0, 0.05);
    stepParallaxState(leftWind, -60, 0, 0.05);
  }

  // Positive wind pushes clouds & wind ribbons right faster than calm breeze
  assert.ok(rightWind.nearCloudScroll > calm.nearCloudScroll);
  assert.ok(rightWind.windRibbonScroll > 100);
  assert.ok(rightWind.nearCloudScroll > rightWind.farCloudScroll);

  // Negative wind pushes clouds & wind ribbons left
  assert.ok(leftWind.nearCloudScroll < 0);
  assert.ok(leftWind.windRibbonScroll < -100);
  assert.ok(leftWind.windSwayOffset < 0);
  assert.ok(rightWind.windSwayOffset > 0);
});

test('computeParallaxOffsets preserves strict multi-plane depth ordering for progress travel', () => {
  const state = createParallaxState(0, 0.75);
  const offsets = computeParallaxOffsets(state, 0);

  assert.ok(
    Math.abs(offsets.celestialX) < Math.abs(offsets.farMountainsX),
    'celestial layer should move slower than far mountains'
  );
  assert.ok(
    Math.abs(offsets.farMountainsX) < Math.abs(offsets.midHillsX),
    'far mountains should move slower than midground hills'
  );
  assert.ok(
    Math.abs(offsets.midHillsX) < Math.abs(offsets.nearFoothillsX),
    'midground hills should move slower than near foothills'
  );
});

test('getLayerWrapOffset stays bounded in [0, period) for positive and negative values', () => {
  assert.equal(getLayerWrapOffset(0, PARALLAX_TILE_PERIOD), 0);
  assert.equal(getLayerWrapOffset(1200, PARALLAX_TILE_PERIOD), 0);
  assert.equal(getLayerWrapOffset(1350, PARALLAX_TILE_PERIOD), 150);
  assert.equal(getLayerWrapOffset(-50, PARALLAX_TILE_PERIOD), 1150);
  assert.equal(getLayerWrapOffset(-2450, PARALLAX_TILE_PERIOD), 1150);
});

test('getSkyAtmosphere transitions smoothly from morning to twilight with valid colors', () => {
  const morning = getSkyAtmosphere(0);
  const sunset = getSkyAtmosphere(0.7);
  const twilight = getSkyAtmosphere(1);

  assert.equal(morning.starAlpha, 0);
  assert.ok(sunset.starAlpha > 0 && sunset.starAlpha < twilight.starAlpha);
  assert.ok(twilight.starAlpha > 0.5);

  // Sun moves across sky horizontally as game progresses
  assert.ok(morning.celestialXRatio > sunset.celestialXRatio);
  assert.ok(sunset.celestialXRatio > twilight.celestialXRatio);

  // Valid rgb/rgba strings
  for (const atmo of [morning, sunset, twilight]) {
    assert.match(atmo.skyTop, /^rgb\(\d+, \d+, \d+\)$/);
    assert.match(atmo.skyMid, /^rgb\(\d+, \d+, \d+\)$/);
    assert.match(atmo.skyBottom, /^rgb\(\d+, \d+, \d+\)$/);
    assert.match(atmo.farRidgeFill, /^rgba\(\d+, \d+, \d+, \d+(\.\d+)?\)$/);
  }
});
