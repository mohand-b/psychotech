import {
  AXIS_STAMP_MAX,
  AxisStampWord,
  SimulationVerdict,
  VerdictTone,
} from '@psychotech/shared';
import { SIMULATION_VERDICT_PRESENTATION } from './simulation-verdict-presentation';
import {
  VERDICT_TONE_COLOR_VARS,
  VERDICT_TONE_INK_VARS,
  resolveVerdictAppearance,
  verdictWordInkVar,
} from './verdict-appearance';

const NON_CRITICAL = { isCritical: false, eliminatoryThreshold: 55 };
const CRITICAL = { isCritical: true, eliminatoryThreshold: 55 };

describe('resolveVerdictAppearance', () => {
  it.each([
    [100, 'Excellent', 'var(--rating-good)'],
    [95, 'Excellent', 'var(--rating-good)'],
    [94.9, 'Solide', 'var(--rating-good)'],
    [85, 'Solide', 'var(--rating-good)'],
    [84.9, 'Bon', 'var(--rating-good)'],
    [70, 'Bon', 'var(--rating-good)'],
    [69.9, 'Fragile', 'var(--rating-weak)'],
    [60, 'Fragile', 'var(--rating-weak)'],
    [59.9, 'Faible', 'var(--rating-bad)'],
    [0, 'Faible', 'var(--rating-bad)'],
  ])('dresses score %s as %s in %s', (score, label, colorVar) => {
    const appearance = resolveVerdictAppearance(score, NON_CRITICAL);
    expect(appearance.label).toBe(label);
    expect(appearance.colorVar).toBe(colorVar);
  });

  it('dresses an eliminated critical axis in the bad tone', () => {
    const appearance = resolveVerdictAppearance(54.9, CRITICAL);
    expect(appearance.label).toBe('Éliminatoire');
    expect(appearance.colorVar).toBe('var(--rating-bad)');
    expect(appearance.inkVar).toBe('var(--rating-bad-ink)');
  });
});

describe('verdict colour single source', () => {
  it('binds one and only one colour token to each verdict word', () => {
    const colorsByLabel = new Map<string, Set<string>>();
    const inksByLabel = new Map<string, Set<string>>();
    for (let step = 0; step <= AXIS_STAMP_MAX * 10; step += 1) {
      const score = step / 10;
      for (const rule of [NON_CRITICAL, CRITICAL, null]) {
        const appearance = resolveVerdictAppearance(score, rule);
        const colors =
          colorsByLabel.get(appearance.label) ?? new Set<string>();
        colors.add(appearance.colorVar);
        colorsByLabel.set(appearance.label, colors);
        const inks = inksByLabel.get(appearance.label) ?? new Set<string>();
        inks.add(appearance.inkVar);
        inksByLabel.set(appearance.label, inks);
      }
    }
    for (const [label, colors] of colorsByLabel) {
      expect([label, [...colors]]).toEqual([label, [...colors].slice(0, 1)]);
    }
    for (const [label, inks] of inksByLabel) {
      expect([label, [...inks]]).toEqual([label, [...inks].slice(0, 1)]);
    }
  });

  it('keeps the stamp ink of a word aligned with the tone of its score band', () => {
    for (let step = 0; step <= AXIS_STAMP_MAX * 10; step += 1) {
      const score = step / 10;
      const appearance = resolveVerdictAppearance(score, CRITICAL);
      expect([score, verdictWordInkVar(appearance.word)]).toEqual([
        score,
        appearance.inkVar,
      ]);
    }
  });

  it('covers every word and every tone with a token', () => {
    for (const word of Object.values(AxisStampWord)) {
      expect(verdictWordInkVar(word)).toMatch(/^var\(--rating-.+-ink\)$/);
    }
    for (const tone of Object.values(VerdictTone)) {
      expect(VERDICT_TONE_COLOR_VARS[tone]).toMatch(/^var\(--rating-.+\)$/);
      expect(VERDICT_TONE_INK_VARS[tone]).toMatch(/^var\(--rating-.+-ink\)$/);
    }
  });

  it('assigns a distinct colour token to every tone', () => {
    const colors = Object.values(VERDICT_TONE_COLOR_VARS);
    expect(new Set(colors).size).toBe(colors.length);
    const inks = Object.values(VERDICT_TONE_INK_VARS);
    expect(new Set(inks).size).toBe(inks.length);
  });

  it('draws the simulation verdict from the same token family', () => {
    expect(
      SIMULATION_VERDICT_PRESENTATION[SimulationVerdict.FAVORABLE].colorVar,
    ).toBe(VERDICT_TONE_COLOR_VARS[VerdictTone.GOOD]);
    expect(
      SIMULATION_VERDICT_PRESENTATION[SimulationVerdict.UNFAVORABLE].colorVar,
    ).toBe(VERDICT_TONE_COLOR_VARS[VerdictTone.BAD]);
  });
});
