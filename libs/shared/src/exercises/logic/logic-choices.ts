import { LogicItemType } from '../../enums';
import { SeededRng } from '../rng';
import {
  LETTER_ALPHABET,
  LogicPuzzle,
  MIXED_TERM_PATTERN,
  SYMBOL_GLYPHS,
} from './logic-rules';

export interface LogicChoices {
  choices: string[];
  answerIndex: number;
}

const NUMERIC_FALLBACK_OFFSETS = [1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 10, -10];
const LETTER_FALLBACK_OFFSETS = [1, -1, 2, -2, 3, -3, 4, -4];

function numericFallbacks(answer: number): string[] {
  return NUMERIC_FALLBACK_OFFSETS.map((offset) => answer + offset)
    .filter((value) => value >= 0)
    .map(String);
}

function letterFallbacks(answerLetter: string): string[] {
  const position = LETTER_ALPHABET.indexOf(answerLetter);
  return LETTER_FALLBACK_OFFSETS.map((offset) => position + offset)
    .filter((candidate) => candidate >= 0 && candidate <= 25)
    .map((candidate) => LETTER_ALPHABET[candidate]);
}

function fallbackCandidates(puzzle: LogicPuzzle): string[] {
  switch (puzzle.type) {
    case LogicItemType.NUMBER:
      return numericFallbacks(Number(puzzle.answer));
    case LogicItemType.LETTER:
      return letterFallbacks(puzzle.answer);
    case LogicItemType.SYMBOL:
      return SYMBOL_GLYPHS.filter((glyph) => glyph !== puzzle.answer);
    case LogicItemType.MIXED: {
      const match = MIXED_TERM_PATTERN.exec(puzzle.answer);
      if (!match) {
        return [];
      }
      const [, letter, digits] = match;
      const number = Number(digits);
      return [
        ...letterFallbacks(letter).map((candidate) => `${candidate}${digits}`),
        ...numericFallbacks(number).map((candidate) => `${letter}${candidate}`),
      ];
    }
  }
}

function isValidDistractor(candidate: string, puzzle: LogicPuzzle): boolean {
  if (candidate === puzzle.answer) {
    return false;
  }
  if (puzzle.type === LogicItemType.NUMBER) {
    const value = Number(candidate);
    return Number.isInteger(value) && value >= 0;
  }
  if (puzzle.type === LogicItemType.MIXED) {
    return MIXED_TERM_PATTERN.test(candidate);
  }
  return candidate.length > 0;
}

function collectValid(candidates: string[], puzzle: LogicPuzzle, seen: Set<string>): string[] {
  const valid: string[] = [];
  for (const candidate of candidates) {
    if (!isValidDistractor(candidate, puzzle) || seen.has(candidate)) {
      continue;
    }
    seen.add(candidate);
    valid.push(candidate);
  }
  return valid;
}

export function buildLogicChoices(rng: SeededRng, puzzle: LogicPuzzle): LogicChoices {
  const choiceCount = puzzle.type === LogicItemType.SYMBOL ? 4 : rng.nextInt(4, 5);
  const seen = new Set<string>([puzzle.answer]);
  const typical = collectValid(puzzle.typicalErrors, puzzle, seen);
  const fallbacks = collectValid(fallbackCandidates(puzzle), puzzle, seen);
  const distractors = [...rng.shuffle(typical), ...rng.shuffle(fallbacks)].slice(
    0,
    choiceCount - 1,
  );
  const answerIndex = rng.nextInt(0, distractors.length);
  const choices = [...distractors];
  choices.splice(answerIndex, 0, puzzle.answer);
  return { choices, answerIndex };
}
