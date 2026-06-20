export type PasswordStrengthLevel =
  | 'empty'
  | 'weak'
  | 'medium'
  | 'strong'
  | 'robust';

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  level: PasswordStrengthLevel;
}

const MIN_LENGTH = 8;
const STRONG_LENGTH = 12;
const MIN_VARIETY_FOR_STRONG = 3;
const MIN_VARIETY_FOR_ROBUST = 4;

const SCORE_LEVELS: Record<0 | 1 | 2 | 3 | 4, PasswordStrengthLevel> = {
  0: 'empty',
  1: 'weak',
  2: 'medium',
  3: 'strong',
  4: 'robust',
};

function countCharacterClasses(value: string): number {
  let count = 0;
  if (/[a-z]/.test(value)) {
    count += 1;
  }
  if (/[A-Z]/.test(value)) {
    count += 1;
  }
  if (/[0-9]/.test(value)) {
    count += 1;
  }
  if (/[^a-zA-Z0-9]/.test(value)) {
    count += 1;
  }
  return count;
}

export function getPasswordStrength(value: string): PasswordStrength {
  if (value.length === 0) {
    return { score: 0, level: SCORE_LEVELS[0] };
  }
  const variety = countCharacterClasses(value);
  let score: 1 | 2 | 3 | 4 = 1;
  if (value.length >= MIN_LENGTH) {
    score = 2;
  }
  if (value.length >= MIN_LENGTH && variety >= MIN_VARIETY_FOR_STRONG) {
    score = 3;
  }
  if (value.length >= STRONG_LENGTH && variety >= MIN_VARIETY_FOR_ROBUST) {
    score = 4;
  }
  return { score, level: SCORE_LEVELS[score] };
}
