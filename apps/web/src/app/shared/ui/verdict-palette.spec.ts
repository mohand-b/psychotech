import { VerdictTone } from '@psychotech/shared';
import {
  VERDICT_TONE_COLOR_VARS,
  VERDICT_TONE_INK_VARS,
} from './verdict-appearance';

const YELLOW_TOKENS = ['--rating-ok', '--rating-ok-ink'];
const YELLOW_HEXES = ['#eab308', '#a16207'];

const VERDICT_PALETTE = [
  ...Object.values(VERDICT_TONE_COLOR_VARS),
  ...Object.values(VERDICT_TONE_INK_VARS),
];

describe('verdict palette', () => {
  it('exposes exactly three tones, one colour and one ink each', () => {
    expect(Object.values(VerdictTone)).toHaveLength(3);
    expect(new Set(Object.values(VERDICT_TONE_COLOR_VARS)).size).toBe(3);
    expect(new Set(Object.values(VERDICT_TONE_INK_VARS)).size).toBe(3);
  });

  it('maps the three tones to the green, orange and red tokens', () => {
    expect(VERDICT_TONE_COLOR_VARS[VerdictTone.GOOD]).toBe(
      'var(--rating-good)',
    );
    expect(VERDICT_TONE_COLOR_VARS[VerdictTone.WEAK]).toBe(
      'var(--rating-weak)',
    );
    expect(VERDICT_TONE_COLOR_VARS[VerdictTone.BAD]).toBe('var(--rating-bad)');
  });

  it.each(YELLOW_TOKENS)('never reaches for the retired token %s', (token) => {
    for (const entry of VERDICT_PALETTE) {
      expect(entry).not.toContain(token);
    }
  });

  it.each(YELLOW_HEXES)('never hardcodes the yellow hex %s', (hex) => {
    for (const entry of VERDICT_PALETTE) {
      expect(entry.toLowerCase()).not.toContain(hex);
    }
  });
});
