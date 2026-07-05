import { SeededRng } from '../rng';
import { LogicPuzzle } from './logic-rules';

export interface LogicChoices {
  choices: string[];
  answerIndex: number;
}

const NUMERIC_FALLBACK_OFFSETS = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 10, -10];

function fallbackCandidates(answer: number): string[] {
  return NUMERIC_FALLBACK_OFFSETS.map((offset) => answer + offset)
    .filter((value) => value >= 0)
    .map(String);
}

function isValidDistractor(candidate: string, answer: string): boolean {
  if (candidate === answer) {
    return false;
  }
  const value = Number(candidate);
  return Number.isInteger(value) && value >= 0;
}

function collectValid(
  candidates: string[],
  answer: string,
  seen: Set<string>,
): string[] {
  const valid: string[] = [];
  for (const candidate of candidates) {
    if (!isValidDistractor(candidate, answer) || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    valid.push(candidate);
  }
  return valid;
}

export const LOGIC_CHOICE_COUNT = 4;

export function buildLogicChoices(rng: SeededRng, puzzle: LogicPuzzle): LogicChoices {
  const seen = new Set<string>([puzzle.answer]);
  const typical = collectValid(puzzle.typicalErrors, puzzle.answer, seen);
  const fallbacks = collectValid(
    fallbackCandidates(Number(puzzle.answer)),
    puzzle.answer,
    seen,
  );
  const distractors = [...rng.shuffle(typical), ...rng.shuffle(fallbacks)].slice(
    0,
    LOGIC_CHOICE_COUNT - 1,
  );
  const answerIndex = rng.nextInt(0, distractors.length);
  const choices = [...distractors];
  choices.splice(answerIndex, 0, puzzle.answer);
  return { choices, answerIndex };
}
