import { SeededRng } from '../rng';

export interface LogicChoiceSource {
  answer: string;
  typicalErrors: string[];
  excluded?: string[];
}

export interface LogicChoiceBounds {
  min: number;
  max: number;
}

export interface LogicChoices {
  choices: string[];
  answerIndex: number;
}

const DEFAULT_BOUNDS: LogicChoiceBounds = {
  min: 0,
  max: Number.MAX_SAFE_INTEGER,
};

const NUMERIC_FALLBACK_OFFSETS = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 10, -10];

function fallbackCandidates(
  answer: number,
  bounds: LogicChoiceBounds,
): string[] {
  return NUMERIC_FALLBACK_OFFSETS.map((offset) => answer + offset)
    .filter((value) => value >= bounds.min && value <= bounds.max)
    .map(String);
}

function isValidDistractor(
  candidate: string,
  answer: string,
  bounds: LogicChoiceBounds,
): boolean {
  if (candidate === answer) {
    return false;
  }
  const value = Number(candidate);
  return (
    Number.isInteger(value) && value >= bounds.min && value <= bounds.max
  );
}

function collectValid(
  candidates: string[],
  answer: string,
  bounds: LogicChoiceBounds,
  seen: Set<string>,
): string[] {
  const valid: string[] = [];
  for (const candidate of candidates) {
    if (!isValidDistractor(candidate, answer, bounds) || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    valid.push(candidate);
  }
  return valid;
}

export const LOGIC_CHOICE_COUNT = 4;

export function buildLogicChoices(
  rng: SeededRng,
  source: LogicChoiceSource,
  bounds: LogicChoiceBounds = DEFAULT_BOUNDS,
): LogicChoices {
  const seen = new Set<string>([source.answer, ...(source.excluded ?? [])]);
  const typical = collectValid(source.typicalErrors, source.answer, bounds, seen);
  const fallbacks = collectValid(
    fallbackCandidates(Number(source.answer), bounds),
    source.answer,
    bounds,
    seen,
  );
  const distractors = [...rng.shuffle(typical), ...rng.shuffle(fallbacks)].slice(
    0,
    LOGIC_CHOICE_COUNT - 1,
  );
  const answerIndex = rng.nextInt(0, distractors.length);
  const choices = [...distractors];
  choices.splice(answerIndex, 0, source.answer);
  return { choices, answerIndex };
}
