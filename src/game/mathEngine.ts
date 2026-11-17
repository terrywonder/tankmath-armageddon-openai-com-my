import type { MathQuestion, MathTier } from './types';

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function buildChoices(correct: number, rng: () => number, offsets: number[]): number[] {
  const set = new Set<number>([correct]);
  const shuffledOffsets = [...offsets].sort(() => rng() - 0.5);

  for (const offset of shuffledOffsets) {
    if (set.size >= 4) break;
    const candidate = correct + offset;
    if (candidate !== correct && Number.isFinite(candidate)) {
      set.add(candidate);
    }
  }

  let fallback = 1;
  while (set.size < 4) {
    const candidate = correct + (fallback % 2 === 0 ? fallback : -fallback);
    if (!set.has(candidate)) {
      set.add(candidate);
    }
    fallback += 1;
  }

  return Array.from(set).sort(() => rng() - 0.5);
}

let questionCounter = 0;

export function generateMathQuestion(
  tier: MathTier,
  rng: () => number = Math.random
): MathQuestion {
  questionCounter += 1;
  const id = `q_${tier}_${questionCounter}`;

  if (tier === 1) {
    const isAdd = rng() < 0.55;
    if (isAdd) {
      const a = randInt(rng, 4, 28);
      const b = randInt(rng, 3, 24);
      const ans = a + b;
      return {
        id,
        tier,
        topic: 'Addition',
        prompt: `${a} + ${b} = ?`,
        hint: 'Add the units and tens cleanly.',
        correctAnswer: ans,
        choices: buildChoices(ans, rng, [-3, -2, -1, 1, 2, 3, 10, -10]),
        explanation: `${a} + ${b} = ${ans}`,
      };
    } else {
      const b = randInt(rng, 3, 19);
      const ans = randInt(rng, 4, 24);
      const a = b + ans;
      return {
        id,
        tier,
        topic: 'Subtraction',
        prompt: `${a} - ${b} = ?`,
        hint: 'Count up from the smaller number.',
        correctAnswer: ans,
        choices: buildChoices(ans, rng, [-4, -2, -1, 1, 2, 4, 10]),
        explanation: `${a} - ${b} = ${ans}`,
      };
    }
  }

  if (tier === 2) {
    const isMult = rng() < 0.6;
    if (isMult) {
      const a = randInt(rng, 3, 12);
      const b = randInt(rng, 4, 12);
      const ans = a * b;
      return {
        id,
        tier,
        topic: 'Multiplication',
        prompt: `${a} × ${b} = ?`,
        hint: `Think of ${a} groups of ${b}.`,
        correctAnswer: ans,
        choices: buildChoices(ans, rng, [-a, a, -b, b, -2, 2, 4, -4]),
        explanation: `${a} × ${b} = ${ans}`,
      };
    } else {
      const b = randInt(rng, 3, 11);
      const ans = randInt(rng, 3, 12);
      const a = b * ans;
      return {
        id,
        tier,
        topic: 'Division',
        prompt: `${a} ÷ ${b} = ?`,
        hint: `What times ${b} equals ${a}?`,
        correctAnswer: ans,
        choices: buildChoices(ans, rng, [-3, -2, -1, 1, 2, 3, 5]),
        explanation: `${a} ÷ ${b} = ${ans} (since ${b} × ${ans} = ${a})`,
      };
    }
  }

  if (tier === 3) {
    const variant = randInt(rng, 0, 2);
    if (variant === 0) {
      const a = randInt(rng, 3, 9);
      const b = randInt(rng, 3, 9);
      const c = randInt(rng, 2, 15);
      const ans = a * b + c;
      return {
        id,
        tier,
        topic: 'Order of Operations',
        prompt: `${a} × ${b} + ${c} = ?`,
        hint: 'Multiply first, then add.',
        correctAnswer: ans,
        choices: buildChoices(ans, rng, [a * (b + c) - ans, -4, 4, -2, 2, 6, -6]),
        explanation: `First ${a} × ${b} = ${a * b}, then + ${c} = ${ans}`,
      };
    } else if (variant === 1) {
      const a = randInt(rng, 4, 10);
      const b = randInt(rng, 3, 9);
      const c = randInt(rng, 2, Math.min(14, a * b - 1));
      const ans = a * b - c;
      return {
        id,
        tier,
        topic: 'Order of Operations',
        prompt: `${a} × ${b} - ${c} = ?`,
        hint: 'Multiply first, then subtract.',
        correctAnswer: ans,
        choices: buildChoices(ans, rng, [2 * c, -3, 3, -5, 5, 10, -10]),
        explanation: `First ${a} × ${b} = ${a * b}, then - ${c} = ${ans}`,
      };
    } else {
      const a = randInt(rng, 2, 8);
      const b = randInt(rng, 3, 9);
      const c = randInt(rng, 2, 6);
      const ans = (a + b) * c;
      return {
        id,
        tier,
        topic: 'Parentheses',
        prompt: `(${a} + ${b}) × ${c} = ?`,
        hint: 'Solve inside the parentheses first.',
        correctAnswer: ans,
        choices: buildChoices(ans, rng, [a + b * c - ans, -c, c, -4, 4, 8, -8]),
        explanation: `First (${a} + ${b}) = ${a + b}, then × ${c} = ${ans}`,
      };
    }
  }

  if (tier === 4) {
    const variant = randInt(rng, 0, 1);
    const x = randInt(rng, 2, 14);
    if (variant === 0) {
      const a = randInt(rng, 2, 7);
      const b = randInt(rng, 3, 18);
      const c = a * x + b;
      return {
        id,
        tier,
        topic: 'Linear Algebra',
        prompt: `${a}x + ${b} = ${c}  →  x = ?`,
        hint: `Subtract ${b} from ${c}, then divide by ${a}.`,
        correctAnswer: x,
        choices: buildChoices(x, rng, [-3, -2, -1, 1, 2, 3, 4]),
        explanation: `${a}x = ${c - b}, so x = ${c - b} ÷ ${a} = ${x}`,
      };
    } else {
      const a = randInt(rng, 2, 6);
      const b = randInt(rng, 2, 9);
      const c = a * (x + b);
      return {
        id,
        tier,
        topic: 'Factored Algebra',
        prompt: `${a}(x + ${b}) = ${c}  →  x = ?`,
        hint: `Divide ${c} by ${a}, then subtract ${b}.`,
        correctAnswer: x,
        choices: buildChoices(x, rng, [b, -2, -1, 1, 2, 3, -3]),
        explanation: `x + ${b} = ${c / a}, so x = ${c / a} - ${b} = ${x}`,
      };
    }
  }

  // Tier 5: Master Artillery (Squares, Roots, Percentages, Multi-step Algebra)
  const variant = randInt(rng, 0, 2);
  if (variant === 0) {
    const root = randInt(rng, 4, 12);
    const sq = root * root;
    const b = randInt(rng, 2, 7);
    const c = randInt(rng, 2, 9);
    const ans = root + b * c;
    return {
      id,
      tier,
      topic: 'Roots & Products',
      prompt: `√${sq} + ${b} × ${c} = ?`,
      hint: `Find √${sq}, then add ${b} × ${c}.`,
      correctAnswer: ans,
      choices: buildChoices(ans, rng, [-4, -2, 2, 4, 6, -6, 10]),
      explanation: `√${sq} = ${root} and ${b} × ${c} = ${b * c}, total = ${ans}`,
    };
  } else if (variant === 1) {
    const pctOptions = [10, 20, 25, 50, 75];
    const pct = pctOptions[randInt(rng, 0, pctOptions.length - 1)];
    const baseUnit = pct === 25 || pct === 75 ? 4 : pct === 20 ? 5 : 10;
    const n = baseUnit * randInt(rng, 2, 16);
    const ans = (pct * n) / 100;
    return {
      id,
      tier,
      topic: 'Percentages',
      prompt: `${pct}% of ${n} = ?`,
      hint: `Convert ${pct}% to a fraction of ${n}.`,
      correctAnswer: ans,
      choices: buildChoices(ans, rng, [-5, -3, -2, 2, 3, 5, 10]),
      explanation: `${pct}% of ${n} = (${pct} ÷ 100) × ${n} = ${ans}`,
    };
  } else {
    const x = randInt(rng, 3, 11);
    const b = randInt(rng, 2, 15);
    const rhs = x * x + b;
    return {
      id,
      tier,
      topic: 'Quadratic (x > 0)',
      prompt: `x² + ${b} = ${rhs}  (x > 0)  →  x = ?`,
      hint: `Subtract ${b}, then take the positive square root.`,
      correctAnswer: x,
      choices: buildChoices(x, rng, [-2, -1, 1, 2, 3, -3, 4]),
      explanation: `x² = ${rhs - b}, so positive x = ${x}`,
    };
  }
}

export function computeAdaptiveTier(
  currentTier: MathTier,
  streak: number,
  consecutiveMisses: number,
  minTier: MathTier = 1
): MathTier {
  if (streak >= 3 && currentTier < 5) {
    return (currentTier + 1) as MathTier;
  }
  if (consecutiveMisses >= 2 && currentTier > minTier) {
    return (currentTier - 1) as MathTier;
  }
  return currentTier;
}

export function calculateShotScore(params: {
  tier: MathTier;
  correct: boolean;
  streak: number;
  damageDealt: number;
  windAbs: number;
}): number {
  const { tier, correct, streak, damageDealt, windAbs } = params;
  if (!correct) {
    return Math.round(damageDealt * 1.5);
  }
  const tierBonus = tier * 40;
  const streakBonus = Math.min(streak, 10) * 15;
  const windBonus = windAbs >= 40 ? 35 : 0;
  return Math.round(tierBonus + streakBonus + windBonus + damageDealt * 3);
}
