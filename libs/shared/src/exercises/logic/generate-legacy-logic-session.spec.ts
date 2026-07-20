import { describe, expect, it } from 'vitest';
import { createSeededRng } from '../rng';
import { generateLegacyLogicSession } from './generate-legacy-logic-session';
import { LogicRuleItem } from './logic-rule-item';
import { digitSum, LOGIC_RULES, LogicPuzzle } from './logic-rules';

const SAMPLE_SEEDS = ['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5'];

function sampleItems(): LogicRuleItem[] {
  return SAMPLE_SEEDS.flatMap((seed) => generateLegacyLogicSession(seed));
}

function numericSeries(puzzle: LogicPuzzle): number[] {
  return [...puzzle.terms, puzzle.answer].map(Number);
}

function continuedPuzzle(sequence: string[], answer: string): LogicPuzzle {
  return { terms: sequence, answer, typicalErrors: [] };
}

function differences(values: number[]): number[] {
  return values.slice(1).map((value, index) => value - values[index]);
}

function hasConstantDifference(values: number[]): boolean {
  const steps = differences(values);
  return steps.every((step) => step === steps[0]);
}

function hasConstantRatio(values: number[]): boolean {
  const ratio = values[1] / values[0];
  return values.slice(1).every((value, index) => value === values[index] * ratio);
}

function hasAlternatingDifferences(values: number[]): boolean {
  const steps = differences(values);
  return (
    steps[0] !== steps[1] &&
    steps.every((step, index) => step === steps[index % 2])
  );
}

function hasConstantSecondDifference(values: number[]): boolean {
  const secondSteps = differences(differences(values));
  return secondSteps.length > 0 && secondSteps.every((step) => step === secondSteps[0]);
}

function splitInterleaved(values: number[]): [number[], number[]] {
  const even = values.filter((_, index) => index % 2 === 0);
  const odd = values.filter((_, index) => index % 2 === 1);
  return [even, odd];
}

function isFibonacciLike(values: number[]): boolean {
  return values
    .slice(2)
    .every((value, index) => value === values[index] + values[index + 1]);
}

function isConsecutiveCubes(values: number[]): boolean {
  const firstRoot = Math.round(Math.cbrt(values[0]));
  return values.every((value, index) => value === (firstRoot + index) ** 3);
}

function validatesAlternatingMultiplyAdd(values: number[]): boolean {
  const ratio = values[1] / values[0];
  const addend = values[2] - values[1];
  if (!Number.isInteger(ratio) || ratio < 2 || addend < 2) {
    return false;
  }
  return values
    .slice(1)
    .every((value, index) =>
      index % 2 === 0 ? value === values[index] * ratio : value === values[index] + addend,
    );
}

const RULE_VALIDATORS: Record<string, (puzzle: LogicPuzzle) => boolean> = {
  'arithmetic-constant-step': (puzzle) => hasConstantDifference(numericSeries(puzzle)),
  'geometric-double-or-triple': (puzzle) => hasConstantRatio(numericSeries(puzzle)),
  'alternating-two-steps': (puzzle) => hasAlternatingDifferences(numericSeries(puzzle)),
  'alternating-add-subtract': (puzzle) => {
    const series = numericSeries(puzzle);
    const steps = differences(series);
    return (
      hasAlternatingDifferences(series) &&
      steps[0] > 0 &&
      steps[1] < 0 &&
      series.every((value) => value >= 0)
    );
  },
  'geometric-fast-or-halving': (puzzle) => hasConstantRatio(numericSeries(puzzle)),
  'increasing-step': (puzzle) => hasConstantSecondDifference(numericSeries(puzzle)),
  'squares-plus-constant': (puzzle) => hasConstantSecondDifference(numericSeries(puzzle)),
  'alternating-multiply-add': (puzzle) => validatesAlternatingMultiplyAdd(numericSeries(puzzle)),
  'fibonacci-like': (puzzle) => isFibonacciLike(numericSeries(puzzle)),
  'interleaved-sequences': (puzzle) =>
    splitInterleaved(numericSeries(puzzle)).every(hasConstantDifference),
  'second-order-differences': (puzzle) => hasConstantSecondDifference(numericSeries(puzzle)),
  powers: (puzzle) =>
    hasConstantRatio(numericSeries(puzzle)) || isConsecutiveCubes(numericSeries(puzzle)),
  'multiply-by-rank': (puzzle) => {
    const series = numericSeries(puzzle);
    return series
      .slice(1)
      .every((value, index) => value === series[index] * (index + 2));
  },
  'add-digit-sum': (puzzle) => {
    const series = numericSeries(puzzle);
    return series
      .slice(1)
      .every((value, index) => value === series[index] + digitSum(series[index]));
  },
  'interleaved-double-fibonacci': (puzzle) => {
    const [even, odd] = splitInterleaved(numericSeries(puzzle));
    return hasConstantRatio(even) && isFibonacciLike(odd);
  },
};

describe('generateLegacyLogicSession', () => {
  it('returns a strictly identical session for the same seed', () => {
    const first = generateLegacyLogicSession('determinism-seed');
    const second = generateLegacyLogicSession('determinism-seed');
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('matches the reference snapshot for a fixed seed', () => {
    expect(generateLegacyLogicSession('snapshot-seed')).toMatchSnapshot();
  });

  it('returns different sessions for different seeds', () => {
    expect(generateLegacyLogicSession('seed-a')).not.toEqual(generateLegacyLogicSession('seed-b'));
  });

  it('produces 40 items, 8 per difficulty level, in increasing difficulty', () => {
    for (const seed of SAMPLE_SEEDS) {
      const items = generateLegacyLogicSession(seed);
      expect(items).toHaveLength(40);
      const byLevel = new Map<number, number>();
      for (const item of items) {
        byLevel.set(item.difficulty, (byLevel.get(item.difficulty) ?? 0) + 1);
      }
      expect([...byLevel.entries()].sort()).toEqual([
        [1, 8],
        [2, 8],
        [3, 8],
        [4, 8],
        [5, 8],
      ]);
      const difficulties = items.map((item) => item.difficulty);
      expect(difficulties).toEqual([...difficulties].sort((a, b) => a - b));
      expect(items.map((item) => item.index)).toEqual(items.map((_, index) => index));
    }
  });

  it('totals 120 points with points equal to difficulty', () => {
    for (const seed of SAMPLE_SEEDS) {
      const items = generateLegacyLogicSession(seed);
      expect(items.every((item) => item.points === item.difficulty)).toBe(true);
      expect(items.reduce((total, item) => total + item.points, 0)).toBe(120);
    }
  });

  it('keeps the correct answer among exactly four unique choices on a 200-item sample', () => {
    for (const item of sampleItems()) {
      expect(item.choices.length).toBe(4);
      expect(new Set(item.choices).size).toBe(item.choices.length);
      expect(item.answerIndex).toBeGreaterThanOrEqual(0);
      expect(item.answerIndex).toBeLessThan(item.choices.length);
      const answer = item.choices[item.answerIndex];
      const distractors = item.choices.filter((_, index) => index !== item.answerIndex);
      expect(distractors).not.toContain(answer);
    }
  });

  it('displays 5 or 6 number terms and never a negative value on a 200-item sample', () => {
    for (const item of sampleItems()) {
      expect(item.sequence.length).toBeGreaterThanOrEqual(5);
      expect(item.sequence.length).toBeLessThanOrEqual(6);
      for (const value of [...item.sequence, ...item.choices].map(Number)) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(99999);
      }
    }
  });

  it('recognizes the in-game reported sequence as a valid add-digit-sum progression', () => {
    const validator = RULE_VALIDATORS['add-digit-sum'];
    expect(
      validator(continuedPuzzle(['31', '35', '43', '50', '55'], '65')),
    ).toBe(true);
    expect(
      validator(continuedPuzzle(['31', '35', '43', '50', '55'], '60')),
    ).toBe(false);
  });

  it('keeps every item verifiable against its own rule, with a unique solution, across 100 sessions', () => {
    for (let seedIndex = 0; seedIndex < 100; seedIndex += 1) {
      for (const item of generateLegacyLogicSession(`integrity-${seedIndex}`)) {
        const validator = RULE_VALIDATORS[item.ruleId];
        expect(validator, `missing validator for rule ${item.ruleId}`).toBeDefined();
        const answer = item.choices[item.answerIndex];
        expect(
          validator(continuedPuzzle(item.sequence, answer)),
          `item ${item.index} (${item.ruleId}) of seed integrity-${seedIndex} breaks its rule: ${item.sequence.join(' → ')} → ${answer}`,
        ).toBe(true);
        for (const [choiceIndex, choice] of item.choices.entries()) {
          if (choiceIndex === item.answerIndex) {
            continue;
          }
          expect(
            validator(continuedPuzzle(item.sequence, choice)),
            `distractor ${choice} also satisfies rule ${item.ruleId} on ${item.sequence.join(' → ')}`,
          ).toBe(false);
        }
      }
    }
  });

  it('generates valid sequences whose answer satisfies each catalog rule', () => {
    for (const rule of LOGIC_RULES) {
      const validator = RULE_VALIDATORS[rule.id];
      expect(validator, `missing validator for rule ${rule.id}`).toBeDefined();
      const rng = createSeededRng(`rule-${rule.id}`);
      for (let attempt = 0; attempt < 25; attempt += 1) {
        const puzzle = rule.generate(rng);
        expect(validator(puzzle), `rule ${rule.id} produced an invalid puzzle`).toBe(true);
        expect(puzzle.terms.length).toBeGreaterThanOrEqual(5);
        expect(puzzle.answer.length).toBeGreaterThan(0);
      }
    }
  });
});
