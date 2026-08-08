import { formatRelativeTime } from './format-relative-time';

const NOW = new Date('2026-08-08T12:00:00.000Z');

describe('formatRelativeTime', () => {
  it('covers the whole french ladder from instant to days', () => {
    expect(formatRelativeTime('2026-08-08T11:59:40.000Z', NOW)).toBe(
      'à l’instant',
    );
    expect(formatRelativeTime('2026-08-08T11:54:00.000Z', NOW)).toBe(
      'il y a 6 min',
    );
    expect(formatRelativeTime('2026-08-08T10:00:00.000Z', NOW)).toBe(
      'il y a 2 h',
    );
    expect(formatRelativeTime('2026-08-07T08:00:00.000Z', NOW)).toBe('hier');
    expect(formatRelativeTime('2026-08-04T12:00:00.000Z', NOW)).toBe(
      'il y a 4 j',
    );
  });
});
