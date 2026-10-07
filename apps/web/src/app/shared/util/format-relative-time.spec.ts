import {
  formatElapsedDaysLabel,
  formatRelativeTime,
} from './format-relative-time';

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

describe('formatElapsedDaysLabel', () => {
  const now = new Date(2026, 9, 7, 15, 0);

  it('counts calendar days, then months, then years, in full words', () => {
    expect(
      formatElapsedDaysLabel(new Date(2026, 9, 7, 8, 0).toISOString(), now),
    ).toBe('Aujourd’hui');
    expect(
      formatElapsedDaysLabel(new Date(2026, 9, 6, 23, 0).toISOString(), now),
    ).toBe('Hier');
    expect(
      formatElapsedDaysLabel(new Date(2026, 9, 4, 12, 0).toISOString(), now),
    ).toBe('Il y a 3 jours');
    expect(
      formatElapsedDaysLabel(new Date(2026, 8, 25, 12, 0).toISOString(), now),
    ).toBe('Il y a 12 jours');
    expect(
      formatElapsedDaysLabel(new Date(2026, 8, 1, 12, 0).toISOString(), now),
    ).toBe('Il y a 1 mois');
    expect(
      formatElapsedDaysLabel(new Date(2025, 8, 1, 12, 0).toISOString(), now),
    ).toBe('Il y a 1 an');
  });
});
