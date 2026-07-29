import {
  AXIS_STAMP_MAX,
  AxisStampWord,
  VERDICT_SCALE,
  VERDICT_WORD_PRESENTATION,
  VerdictTone,
  resolveVerdictBand,
  resolveVerdictTone,
} from './verdict-band';

const NON_CRITICAL = { isCritical: false, eliminatoryThreshold: 55 };
const CRITICAL = { isCritical: true, eliminatoryThreshold: 55 };

describe('resolveVerdictBand bounds', () => {
  it.each([
    [100, AxisStampWord.EXCELLENT, VerdictTone.GOOD],
    [95, AxisStampWord.EXCELLENT, VerdictTone.GOOD],
    [94.9, AxisStampWord.SOLID, VerdictTone.GOOD],
    [85, AxisStampWord.SOLID, VerdictTone.GOOD],
    [84.9, AxisStampWord.GOOD, VerdictTone.OK],
    [70, AxisStampWord.GOOD, VerdictTone.OK],
    [69.9, AxisStampWord.FRAGILE, VerdictTone.WEAK],
    [60, AxisStampWord.FRAGILE, VerdictTone.WEAK],
    [59.9, AxisStampWord.WEAK, VerdictTone.BAD],
    [0, AxisStampWord.WEAK, VerdictTone.BAD],
  ])('maps score %s to %s / %s', (score, word, tone) => {
    const band = resolveVerdictBand(score, NON_CRITICAL);
    expect(band.word).toBe(word);
    expect(band.tone).toBe(tone);
    expect(band.isEliminatory).toBe(false);
  });

  it('overrides a critical axis under its eliminatory threshold', () => {
    const band = resolveVerdictBand(54.9, CRITICAL);
    expect(band.word).toBe(AxisStampWord.ELIMINATORY);
    expect(band.tone).toBe(VerdictTone.BAD);
    expect(band.isEliminatory).toBe(true);
    expect(band.rangeLabel).toBe('< 55');
  });

  it('keeps the score word for a critical axis at its eliminatory threshold', () => {
    expect(resolveVerdictBand(55, CRITICAL).word).toBe(AxisStampWord.WEAK);
  });

  it('never eliminates a non-critical axis, even far under the threshold', () => {
    expect(resolveVerdictBand(12, NON_CRITICAL).isEliminatory).toBe(false);
  });

  it('resolves without an eliminatory rule', () => {
    expect(resolveVerdictBand(42).word).toBe(AxisStampWord.WEAK);
    expect(resolveVerdictTone(88)).toBe(VerdictTone.GOOD);
  });

  it.each([
    [100, '95 – 100'],
    [90, '85 – 94'],
    [75, '70 – 84'],
    [65, '60 – 69'],
    [10, '0 – 59'],
  ])('labels the range of score %s as %s', (score, rangeLabel) => {
    expect(resolveVerdictBand(score).rangeLabel).toBe(rangeLabel);
  });
});

describe('verdict scale integrity', () => {
  it('covers every stamp word exactly once, eliminatory excepted', () => {
    const scaled = VERDICT_SCALE.map((step) => step.word);
    expect(new Set(scaled).size).toBe(scaled.length);
    expect(new Set(scaled)).toEqual(
      new Set(
        Object.values(AxisStampWord).filter(
          (word) => word !== AxisStampWord.ELIMINATORY,
        ),
      ),
    );
  });

  it('declares strictly descending bounds down to zero', () => {
    const mins = VERDICT_SCALE.map((step) => step.min);
    expect(mins).toEqual([...mins].sort((a, b) => b - a));
    expect(new Set(mins).size).toBe(mins.length);
    expect(mins[mins.length - 1]).toBe(0);
  });

  it('presents every stamp word with a label and a tone', () => {
    for (const word of Object.values(AxisStampWord)) {
      const presentation = VERDICT_WORD_PRESENTATION[word];
      expect(presentation.label.length).toBeGreaterThan(0);
      expect(Object.values(VerdictTone)).toContain(presentation.tone);
    }
  });

  it('binds one and only one tone to each word across the whole score range', () => {
    const tonesByLabel = new Map<string, Set<VerdictTone>>();
    for (let score = 0; score <= AXIS_STAMP_MAX; score += 0.1) {
      for (const rule of [NON_CRITICAL, CRITICAL, undefined]) {
        const band = resolveVerdictBand(Math.round(score * 10) / 10, rule);
        const tones = tonesByLabel.get(band.label) ?? new Set<VerdictTone>();
        tones.add(band.tone);
        tonesByLabel.set(band.label, tones);
      }
    }
    for (const [label, tones] of tonesByLabel) {
      expect([label, tones.size]).toEqual([label, 1]);
    }
  });
});
