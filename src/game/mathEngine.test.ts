import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateShotScore, computeAdaptiveTier, generateMathQuestion } from './mathEngine';
import type { MathTier } from './types';

test('generateMathQuestion produces 4 unique choices including correctAnswer across all tiers', () => {
  const tiers: MathTier[] = [1, 2, 3, 4, 5];
  for (const tier of tiers) {
    for (let i = 0; i < 20; i++) {
      const q = generateMathQuestion(tier);
      assert.equal(q.tier, tier);
      assert.equal(q.choices.length, 4, `Tier ${tier} should have 4 choices`);
      assert.equal(new Set(q.choices).size, 4, `Tier ${tier} choices must be unique`);
      assert.ok(q.choices.includes(q.correctAnswer), `Tier ${tier} choices must contain correctAnswer`);
      assert.ok(q.prompt.length > 0);
      assert.ok(q.explanation.length > 0);
    }
  }
});

test('computeAdaptiveTier scales difficulty up on 3-streak and down on 2 misses', () => {
  assert.equal(computeAdaptiveTier(1, 3, 0), 2);
  assert.equal(computeAdaptiveTier(4, 3, 0), 5);
  assert.equal(computeAdaptiveTier(5, 5, 0), 5); // caps at 5
  assert.equal(computeAdaptiveTier(3, 0, 2), 2);
  assert.equal(computeAdaptiveTier(2, 0, 2, 2), 2); // respects minTier
});

test('calculateShotScore rewards accuracy, tier, streak, and high wind', () => {
  const wrongScore = calculateShotScore({
    tier: 3,
    correct: false,
    streak: 0,
    damageDealt: 10,
    windAbs: 0,
  });
  const rightScore = calculateShotScore({
    tier: 3,
    correct: true,
    streak: 4,
    damageDealt: 38,
    windAbs: 50,
  });
  assert.equal(wrongScore, 15);
  assert.ok(rightScore > wrongScore);
  assert.equal(rightScore, 120 + 60 + 35 + 114);
});
