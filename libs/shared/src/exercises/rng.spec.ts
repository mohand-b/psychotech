import { describe, expect, it } from 'vitest';
import { createSeededRng } from './rng';

describe('createSeededRng', () => {
  it('produces the exact same stream for the same seed', () => {
    const first = createSeededRng('seed-a');
    const second = createSeededRng('seed-a');
    const firstStream = Array.from({ length: 50 }, () => first.next());
    const secondStream = Array.from({ length: 50 }, () => second.next());
    expect(secondStream).toEqual(firstStream);
  });

  it('produces different streams for different seeds', () => {
    const first = Array.from({ length: 20 }, createSeededRng('seed-a').next);
    const second = Array.from({ length: 20 }, createSeededRng('seed-b').next);
    expect(second).not.toEqual(first);
  });

  it('returns values in [0, 1)', () => {
    const rng = createSeededRng('bounds');
    for (let draw = 0; draw < 1000; draw += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('returns integers within inclusive bounds and covers them', () => {
    const rng = createSeededRng('ints');
    const drawn = new Set<number>();
    for (let draw = 0; draw < 1000; draw += 1) {
      const value = rng.nextInt(2, 5);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(2);
      expect(value).toBeLessThanOrEqual(5);
      drawn.add(value);
    }
    expect(drawn).toEqual(new Set([2, 3, 4, 5]));
  });

  it('picks elements belonging to the source array', () => {
    const rng = createSeededRng('pick');
    const items = ['a', 'b', 'c'];
    for (let draw = 0; draw < 100; draw += 1) {
      expect(items).toContain(rng.pick(items));
    }
  });

  it('shuffles into a permutation without mutating the source', () => {
    const rng = createSeededRng('shuffle');
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = rng.shuffle(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
  });
});
