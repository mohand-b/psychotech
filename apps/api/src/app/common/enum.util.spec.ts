import { describe, expect, it } from 'vitest';
import { mapEnumValue } from './enum.util';

const COLORS = { RED: 'RED', BLUE: 'BLUE' } as const;

describe('mapEnumValue', () => {
  it('maps a known value to its enum member', () => {
    expect(mapEnumValue(COLORS, 'RED')).toBe(COLORS.RED);
    expect(mapEnumValue(COLORS, 'BLUE')).toBe(COLORS.BLUE);
  });

  it('throws instead of returning undefined for an unknown value', () => {
    expect(() => mapEnumValue(COLORS, 'GREEN')).toThrow(
      'Unknown enum value: GREEN',
    );
  });

  it('throws for a value that collides with an object prototype member', () => {
    expect(() => mapEnumValue(COLORS, 'toString')).toThrow(
      'Unknown enum value: toString',
    );
  });
});
