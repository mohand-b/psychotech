import { passwordsMatch } from './password-match';

describe('passwordsMatch', () => {
  it('is false when the confirmation is empty', () => {
    expect(passwordsMatch('super-secret', '')).toBe(false);
  });

  it('is false when the values differ', () => {
    expect(passwordsMatch('super-secret', 'super-secre')).toBe(false);
  });

  it('is true when both values are equal and non-empty', () => {
    expect(passwordsMatch('super-secret', 'super-secret')).toBe(true);
  });
});
