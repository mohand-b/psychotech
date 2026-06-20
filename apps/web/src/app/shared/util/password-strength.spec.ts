import { getPasswordStrength } from './password-strength';

describe('getPasswordStrength', () => {
  it('returns an empty result for an empty value', () => {
    expect(getPasswordStrength('')).toEqual({ score: 0, level: 'empty' });
  });

  it('rates a short password as weak', () => {
    expect(getPasswordStrength('abc')).toEqual({ score: 1, level: 'weak' });
  });

  it('rates a valid eight-character password at least medium', () => {
    const result = getPasswordStrength('abcdefgh');
    expect(result.score).toBeGreaterThanOrEqual(2);
    expect(result.level).toBe('medium');
  });

  it('rates a varied eight-character password as strong', () => {
    expect(getPasswordStrength('Abcdefg1')).toEqual({
      score: 3,
      level: 'strong',
    });
  });

  it('rates a long password using all classes as robust', () => {
    expect(getPasswordStrength('Abcdefg1!xyzZ')).toEqual({
      score: 4,
      level: 'robust',
    });
  });

  it('does not reach robust without enough length', () => {
    expect(getPasswordStrength('Abc1!').score).toBeLessThan(4);
  });
});
