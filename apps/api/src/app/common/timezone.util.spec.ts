import { describe, expect, it } from 'vitest';
import {
  localDayNumber,
  nextLocalMidnight,
  previousLocalDayNumber,
} from './timezone.util';

const PARIS = 'Europe/Paris';
const TOKYO = 'Asia/Tokyo';
const NEW_YORK = 'America/New_York';

describe('localDayNumber', () => {
  it('reads the calendar day of the local timezone, not of UTC', () => {
    const lateEvening = new Date('2026-03-10T23:30:00.000Z');
    expect(localDayNumber(lateEvening, PARIS)).toBe(20260311);
    expect(localDayNumber(lateEvening, NEW_YORK)).toBe(20260310);
  });

  it('rolls the day forward for timezones ahead of UTC', () => {
    const utcAfternoon = new Date('2026-03-10T16:00:00.000Z');
    expect(localDayNumber(utcAfternoon, TOKYO)).toBe(20260311);
  });

  it('orders days chronologically across a month boundary', () => {
    const endOfMonth = new Date('2026-01-31T12:00:00.000Z');
    const startOfNext = new Date('2026-02-01T12:00:00.000Z');
    expect(localDayNumber(endOfMonth, PARIS)).toBeLessThan(
      localDayNumber(startOfNext, PARIS),
    );
  });
});

describe('previousLocalDayNumber', () => {
  it('returns the day before the local day', () => {
    const noon = new Date('2026-03-10T12:00:00.000Z');
    expect(previousLocalDayNumber(noon, PARIS)).toBe(20260309);
  });

  it('walks back across a month boundary', () => {
    const firstOfMarch = new Date('2026-03-01T12:00:00.000Z');
    expect(previousLocalDayNumber(firstOfMarch, PARIS)).toBe(20260228);
  });

  it('walks back across a year boundary', () => {
    const newYearsDay = new Date('2026-01-01T12:00:00.000Z');
    expect(previousLocalDayNumber(newYearsDay, PARIS)).toBe(20251231);
  });
});

describe('nextLocalMidnight', () => {
  it('lands on the next local midnight for a timezone ahead of UTC', () => {
    const noonParis = new Date('2026-03-10T11:00:00.000Z');
    expect(nextLocalMidnight(noonParis, PARIS).toISOString()).toBe(
      '2026-03-10T23:00:00.000Z',
    );
  });

  it('lands on the next local midnight for a timezone behind UTC', () => {
    const noonNewYork = new Date('2026-03-10T16:00:00.000Z');
    expect(nextLocalMidnight(noonNewYork, NEW_YORK).toISOString()).toBe(
      '2026-03-11T04:00:00.000Z',
    );
  });

  it('always returns an instant strictly in the future', () => {
    for (const timezone of [PARIS, TOKYO, NEW_YORK]) {
      for (const hour of [0, 6, 12, 18, 23]) {
        const now = new Date(
          `2026-06-15T${String(hour).padStart(2, '0')}:00:00.000Z`,
        );
        expect(nextLocalMidnight(now, timezone).getTime()).toBeGreaterThan(
          now.getTime(),
        );
      }
    }
  });

  it('crosses the spring daylight saving transition in Paris', () => {
    const beforeSpringForward = new Date('2026-03-28T12:00:00.000Z');
    expect(nextLocalMidnight(beforeSpringForward, PARIS).toISOString()).toBe(
      '2026-03-28T23:00:00.000Z',
    );
  });

  it('crosses the autumn daylight saving transition in Paris', () => {
    const beforeFallBack = new Date('2026-10-24T12:00:00.000Z');
    expect(nextLocalMidnight(beforeFallBack, PARIS).toISOString()).toBe(
      '2026-10-24T22:00:00.000Z',
    );
  });

  it('advances the local day number by exactly one', () => {
    const now = new Date('2026-06-15T09:00:00.000Z');
    const midnight = nextLocalMidnight(now, PARIS);
    expect(localDayNumber(now, PARIS)).toBe(20260615);
    expect(previousLocalDayNumber(midnight, PARIS)).toBe(20260615);
  });
});
