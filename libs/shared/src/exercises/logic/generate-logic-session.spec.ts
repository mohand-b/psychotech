import { describe, expect, it } from 'vitest';
import { LogicItemType } from '../../enums';
import { createSeededRng } from '../rng';
import { generateLogicSession } from './generate-logic-session';
import { LogicItem } from './logic-item';
import {
  digitSum,
  LETTER_ALPHABET,
  LOGIC_RULES,
  LogicPuzzle,
  MIXED_TERM_PATTERN,
  SYMBOL_GLYPHS,
} from './logic-rules';

const SAMPLE_SEEDS = ['seed-1', 'seed-2', 'seed-3', 'seed-4', 'seed-5'];

function sampleItems(): LogicItem[] {
  return SAMPLE_SEEDS.flatMap((seed) => generateLogicSession(seed));
}

function numericSeries(puzzle: LogicPuzzle): number[] {
  return [...puzzle.terms, puzzle.answer].map(Number);
}

function letterSeries(puzzle: LogicPuzzle): number[] {
  return [...puzzle.terms, puzzle.answer].map((term) => LETTER_ALPHABET.indexOf(term));
}

function symbolSeries(puzzle: LogicPuzzle): string[] {
  return [...puzzle.terms, puzzle.answer];
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

function isPeriodic(values: string[]): boolean {
  for (let period = 3; period <= 4; period += 1) {
    if (values.every((value, index) => value === values[index % period])) {
      return true;
    }
  }
  return false;
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

function validatesMixed(puzzle: LogicPuzzle): boolean {
  const parts = [...puzzle.terms, puzzle.answer].map((term) => MIXED_TERM_PATTERN.exec(term));
  if (parts.some((part) => part === null)) {
    return false;
  }
  const letters = parts.map((part) => LETTER_ALPHABET.indexOf((part as RegExpExecArray)[1]));
  const numbers = parts.map((part) => Number((part as RegExpExecArray)[2]));
  return hasConstantDifference(letters) && (hasConstantDifference(numbers) || hasConstantRatio(numbers));
}

const RULE_VALIDATORS: Record<string, (puzzle: LogicPuzzle) => boolean> = {
  'arithmetic-constant-step': (puzzle) => hasConstantDifference(numericSeries(puzzle)),
  'geometric-double-or-triple': (puzzle) => hasConstantRatio(numericSeries(puzzle)),
  'letter-constant-step': (puzzle) => hasConstantDifference(letterSeries(puzzle)),
  'symbol-cycle': (puzzle) => isPeriodic(symbolSeries(puzzle)),
  'alternating-two-steps': (puzzle) => hasAlternatingDifferences(numericSeries(puzzle)),
  'geometric-fast-or-halving': (puzzle) => hasConstantRatio(numericSeries(puzzle)),
  'letter-alternating-step': (puzzle) => hasAlternatingDifferences(letterSeries(puzzle)),
  'symbol-cycle-inverted': (puzzle) => isPeriodic(symbolSeries(puzzle)),
  'increasing-step': (puzzle) => hasConstantSecondDifference(numericSeries(puzzle)),
  'squares-plus-constant': (puzzle) => hasConstantSecondDifference(numericSeries(puzzle)),
  'alternating-multiply-add': (puzzle) => validatesAlternatingMultiplyAdd(numericSeries(puzzle)),
  'mixed-letter-number': validatesMixed,
  'fibonacci-like': (puzzle) => isFibonacciLike(numericSeries(puzzle)),
  'interleaved-sequences': (puzzle) =>
    splitInterleaved(numericSeries(puzzle)).every(hasConstantDifference),
  'second-order-differences': (puzzle) => hasConstantSecondDifference(numericSeries(puzzle)),
  powers: (puzzle) =>
    hasConstantRatio(numericSeries(puzzle)) || isConsecutiveCubes(numericSeries(puzzle)),
  'multiply-by-rank': (puzzle) =>
    numericSeries(puzzle)
      .slice(1)
      .every((value, index) => value === numericSeries(puzzle)[index] * (index + 2)),
  'add-digit-sum': (puzzle) =>
    numericSeries(puzzle)
      .slice(1)
      .every((value, index) => {
        const previous = numericSeries(puzzle)[index];
        return value === previous + digitSum(previous);
      }),
  'interleaved-double-fibonacci': (puzzle) => {
    const [even, odd] = splitInterleaved(numericSeries(puzzle));
    return hasConstantRatio(even) && isFibonacciLike(odd);
  },
};

describe('generateLogicSession', () => {
  it('returns a strictly identical session for the same seed', () => {
    const first = generateLogicSession('determinism-seed');
    const second = generateLogicSession('determinism-seed');
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('matches the reference snapshot for a fixed seed', () => {
    expect(generateLogicSession('snapshot-seed')).toMatchSnapshot();
  });

  it('returns different sessions for different seeds', () => {
    expect(generateLogicSession('seed-a')).not.toEqual(generateLogicSession('seed-b'));
  });

  it('produces 40 items, 8 per difficulty level, in increasing difficulty', () => {
    for (const seed of SAMPLE_SEEDS) {
      const items = generateLogicSession(seed);
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
      const items = generateLogicSession(seed);
      expect(items.every((item) => item.points === item.difficulty)).toBe(true);
      expect(items.reduce((total, item) => total + item.points, 0)).toBe(120);
    }
  });

  it('keeps the correct answer among unique, distinct choices on a 200-item sample', () => {
    for (const item of sampleItems()) {
      expect(item.choices.length).toBeGreaterThanOrEqual(4);
      expect(item.choices.length).toBeLessThanOrEqual(5);
      expect(new Set(item.choices).size).toBe(item.choices.length);
      expect(item.answerIndex).toBeGreaterThanOrEqual(0);
      expect(item.answerIndex).toBeLessThan(item.choices.length);
      const answer = item.choices[item.answerIndex];
      const distractors = item.choices.filter((_, index) => index !== item.answerIndex);
      expect(distractors).not.toContain(answer);
    }
  });

  it('displays 5 or 6 terms and never a negative value on a 200-item sample', () => {
    for (const item of sampleItems()) {
      expect(item.sequence.length).toBeGreaterThanOrEqual(5);
      expect(item.sequence.length).toBeLessThanOrEqual(6);
      if (item.type === LogicItemType.NUMBER) {
        for (const value of [...item.sequence, ...item.choices].map(Number)) {
          expect(Number.isInteger(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(99999);
        }
      }
      if (item.type === LogicItemType.SYMBOL) {
        for (const glyph of [...item.sequence, ...item.choices]) {
          expect(SYMBOL_GLYPHS).toContain(glyph);
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
