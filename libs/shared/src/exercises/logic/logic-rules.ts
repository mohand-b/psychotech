import { SeededRng } from '../rng';
import { LogicDifficulty } from './logic-item';

export interface LogicPuzzle {
  terms: string[];
  answer: string;
  typicalErrors: string[];
}

export interface LogicRule {
  id: string;
  difficulty: LogicDifficulty;
  generate(rng: SeededRng): LogicPuzzle;
}

export function digitSum(value: number): number {
  return [...String(value)].reduce((sum, digit) => sum + Number(digit), 0);
}

function accumulate(start: number, steps: number[]): number[] {
  const values = [start];
  for (const step of steps) {
    values.push(values[values.length - 1] + step);
  }
  return values;
}

function numericPuzzle(values: number[], typicalErrors: number[]): LogicPuzzle {
  const answer = values[values.length - 1];
  return {
    terms: values.slice(0, -1).map(String),
    answer: String(answer),
    typicalErrors: typicalErrors.map((error) => String(Math.round(error))),
  };
}

export const LOGIC_RULES: readonly LogicRule[] = [
  {
    id: 'arithmetic-constant-step',
    difficulty: 1,
    generate(rng) {
      const step = rng.nextInt(2, 9);
      const direction = rng.pick([1, -1]);
      const termCount = rng.nextInt(5, 6);
      const start =
        direction === 1 ? rng.nextInt(2, 20) : step * termCount + rng.nextInt(1, 20);
      const values = accumulate(start, Array.from({ length: termCount }, () => step * direction));
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        last + direction * (step - 1),
        last + direction * (step + 1),
        answer + direction * step,
        last,
        answer + 2 * direction,
      ]);
    },
  },
  {
    id: 'geometric-double-or-triple',
    difficulty: 1,
    generate(rng) {
      const ratio = rng.pick([2, 3]);
      const termCount = rng.nextInt(5, 6);
      const start = ratio === 2 ? rng.nextInt(2, 6) : rng.nextInt(1, 4);
      const values = [start];
      while (values.length < termCount + 1) {
        values.push(values[values.length - 1] * ratio);
      }
      const previous = values[values.length - 3];
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        last * (ratio + 1),
        last + (last - previous),
        answer * 1.25,
        answer * 0.75,
        answer + ratio,
      ]);
    },
  },
  {
    id: 'alternating-two-steps',
    difficulty: 2,
    generate(rng) {
      const stepA = rng.nextInt(2, 9);
      const offsetB = rng.nextInt(1, 7);
      const stepB = ((stepA - 2 + offsetB) % 8) + 2;
      const termCount = rng.nextInt(5, 6);
      const start = rng.nextInt(1, 15);
      const steps = Array.from({ length: termCount }, (_, index) =>
        index % 2 === 0 ? stepA : stepB,
      );
      const values = accumulate(start, steps);
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      const wrongStep = answer - last === stepA ? stepB : stepA;
      return numericPuzzle(values, [
        last + wrongStep,
        last + stepA + stepB,
        answer + 1,
        answer - 1,
        answer + 2,
      ]);
    },
  },
  {
    id: 'alternating-add-subtract',
    difficulty: 2,
    generate(rng) {
      const addStep = rng.nextInt(4, 9);
      const subtractStep = rng.nextInt(2, addStep - 1);
      const termCount = rng.nextInt(5, 6);
      const start = rng.nextInt(5, 20);
      const steps = Array.from({ length: termCount }, (_, index) =>
        index % 2 === 0 ? addStep : -subtractStep,
      );
      const values = accumulate(start, steps);
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      const expectedStep = answer - last;
      const wrongStep = expectedStep === addStep ? -subtractStep : addStep;
      return numericPuzzle(values, [
        last + wrongStep,
        answer + 1,
        answer - 1,
        answer + 2,
        answer - 2,
      ]);
    },
  },
  {
    id: 'geometric-fast-or-halving',
    difficulty: 2,
    generate(rng) {
      const halving = rng.next() < 0.5;
      const termCount = rng.nextInt(5, 6);
      let values: number[];
      if (halving) {
        const finalValue = rng.nextInt(2, 9);
        values = Array.from(
          { length: termCount + 1 },
          (_, index) => finalValue * 2 ** (termCount - index),
        );
      } else {
        const ratio = rng.pick([4, 5]);
        const start = rng.nextInt(1, ratio === 5 ? 2 : 3);
        values = [start];
        while (values.length < termCount + 1) {
          values.push(values[values.length - 1] * ratio);
        }
      }
      const previous = values[values.length - 3];
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        halving ? answer * 2 : last * (answer / last + 1),
        halving ? answer + 1 : last + (last - previous),
        halving ? answer - 1 : answer * 1.2,
        answer + 2,
        halving ? answer * 1.5 : answer * 0.8,
      ]);
    },
  },
  {
    id: 'increasing-step',
    difficulty: 3,
    generate(rng) {
      const firstStep = rng.nextInt(1, 4);
      const termCount = rng.nextInt(5, 6);
      const steps = Array.from({ length: termCount }, (_, index) => firstStep + index);
      const start = rng.nextInt(1, 15);
      const values = accumulate(start, steps);
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        answer - 1,
        answer + 1,
        answer - 2,
        answer + 2,
        last + firstStep,
      ]);
    },
  },
  {
    id: 'squares-plus-constant',
    difficulty: 3,
    generate(rng) {
      const offset = rng.nextInt(0, 9);
      const firstRoot = rng.nextInt(1, 4);
      const termCount = rng.nextInt(5, 6);
      const values = Array.from(
        { length: termCount + 1 },
        (_, index) => (firstRoot + index) ** 2 + offset,
      );
      const previous = values[values.length - 3];
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        last + (last - previous),
        answer + 1,
        answer - 1,
        answer + 2,
        answer - 2,
      ]);
    },
  },
  {
    id: 'alternating-multiply-add',
    difficulty: 3,
    generate(rng) {
      const ratio = rng.pick([2, 3]);
      const addend = rng.nextInt(2, 9);
      const termCount = rng.nextInt(5, 6);
      const start = rng.nextInt(2, ratio === 3 ? 3 : 5);
      const values = [start];
      for (let index = 0; index < termCount; index += 1) {
        const previous = values[values.length - 1];
        values.push(index % 2 === 0 ? previous * ratio : previous + addend);
      }
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      const multiplyExpected = answer === last * ratio;
      return numericPuzzle(values, [
        multiplyExpected ? last + addend : last * ratio,
        answer + 1,
        answer - 1,
        answer + addend,
      ]);
    },
  },
  {
    id: 'fibonacci-like',
    difficulty: 4,
    generate(rng) {
      const termCount = rng.nextInt(5, 6);
      const values = [rng.nextInt(1, 9), rng.nextInt(1, 9)];
      while (values.length < termCount + 1) {
        values.push(values[values.length - 1] + values[values.length - 2]);
      }
      const previous = values[values.length - 3];
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        last * 2,
        last + (last - previous),
        answer + 1,
        answer - 1,
      ]);
    },
  },
  {
    id: 'interleaved-sequences',
    difficulty: 4,
    generate(rng) {
      const firstStart = rng.nextInt(1, 9);
      const firstStep = rng.nextInt(2, 9);
      const secondStart = rng.nextInt(10, 30);
      const secondStep = rng.nextInt(5, 12);
      const termCount = 6;
      const values = Array.from({ length: termCount + 1 }, (_, index) => {
        const pairIndex = Math.floor(index / 2);
        return index % 2 === 0
          ? firstStart + firstStep * pairIndex
          : secondStart + secondStep * pairIndex;
      });
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        secondStart + secondStep * 3,
        answer + firstStep,
        answer - firstStep,
        answer + 1,
        answer - 1,
      ]);
    },
  },
  {
    id: 'second-order-differences',
    difficulty: 4,
    generate(rng) {
      const firstStep = rng.nextInt(2, 6);
      const stepIncrement = rng.nextInt(2, 4);
      const termCount = rng.nextInt(5, 6);
      const steps = Array.from(
        { length: termCount },
        (_, index) => firstStep + stepIncrement * index,
      );
      const start = rng.nextInt(1, 15);
      const values = accumulate(start, steps);
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        last + (answer - last) - stepIncrement,
        answer + stepIncrement,
        answer + 1,
        answer - 1,
      ]);
    },
  },
  {
    id: 'powers',
    difficulty: 5,
    generate(rng) {
      const variant = rng.pick(['base2', 'base3', 'cubes']);
      const termCount = rng.nextInt(5, 6);
      let values: number[];
      if (variant === 'base2') {
        const firstExponent = rng.nextInt(1, 4);
        values = Array.from(
          { length: termCount + 1 },
          (_, index) => 2 ** (firstExponent + index),
        );
      } else if (variant === 'base3') {
        const firstExponent = rng.nextInt(1, 2);
        values = Array.from(
          { length: termCount + 1 },
          (_, index) => 3 ** (firstExponent + index),
        );
      } else {
        const firstRoot = rng.nextInt(1, 3);
        values = Array.from(
          { length: termCount + 1 },
          (_, index) => (firstRoot + index) ** 3,
        );
      }
      const previous = values[values.length - 3];
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        last + (last - previous),
        last * (answer / last === 2 ? 3 : 2),
        answer * 0.9,
        answer * 1.1,
      ]);
    },
  },
  {
    id: 'multiply-by-rank',
    difficulty: 5,
    generate(rng) {
      const start = rng.nextInt(1, 3);
      const termCount = 5;
      const values = [start];
      for (let rank = 2; rank <= termCount + 1; rank += 1) {
        values.push(values[values.length - 1] * rank);
      }
      const previous = values[values.length - 3];
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        last * termCount,
        last * (termCount + 2),
        last + (last - previous),
        answer + termCount,
      ]);
    },
  },
  {
    id: 'add-digit-sum',
    difficulty: 5,
    generate(rng) {
      const termCount = rng.nextInt(5, 6);
      const values = [rng.nextInt(10, 40)];
      while (values.length < termCount + 1) {
        const current = values[values.length - 1];
        values.push(current + digitSum(current));
      }
      const previous = values[values.length - 3];
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        last + digitSum(previous),
        last + (last - previous),
        answer + 1,
        answer - 1,
      ]);
    },
  },
  {
    id: 'interleaved-double-fibonacci',
    difficulty: 5,
    generate(rng) {
      const doubleStart = rng.nextInt(1, 3);
      const doubling = [doubleStart];
      while (doubling.length < 4) {
        doubling.push(doubling[doubling.length - 1] * 2);
      }
      const fibonacci = [rng.nextInt(1, 5), rng.nextInt(1, 5)];
      while (fibonacci.length < 4) {
        fibonacci.push(fibonacci[fibonacci.length - 1] + fibonacci[fibonacci.length - 2]);
      }
      const termCount = 6;
      const values = Array.from({ length: termCount + 1 }, (_, index) =>
        index % 2 === 0 ? doubling[index / 2] : fibonacci[(index - 1) / 2],
      );
      const last = values[values.length - 2];
      const answer = values[values.length - 1];
      return numericPuzzle(values, [
        fibonacci[3],
        last * 2,
        answer + doubleStart,
        answer - doubleStart,
      ]);
    },
  },
];
