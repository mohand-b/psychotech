import { SimulationVerdict } from './simulation-verdict';
import {
  AxisStampWord,
  SimulationStampQualifier,
  buildAxisStamp,
  buildSimulationStamp,
} from './verdict-stamp';

const THRESHOLD = 70;

describe('buildSimulationStamp', () => {
  it.each([
    [95, SimulationVerdict.FAVORABLE, SimulationStampQualifier.EXCELLENT],
    [100, SimulationVerdict.FAVORABLE, SimulationStampQualifier.EXCELLENT],
    [94.9, SimulationVerdict.FAVORABLE, SimulationStampQualifier.SOLID],
    [85, SimulationVerdict.FAVORABLE, SimulationStampQualifier.SOLID],
    [84.9, SimulationVerdict.FAVORABLE, SimulationStampQualifier.COMFORTABLE],
    [75, SimulationVerdict.FAVORABLE, SimulationStampQualifier.COMFORTABLE],
    [74.9, SimulationVerdict.FAVORABLE, SimulationStampQualifier.JUST],
    [70, SimulationVerdict.FAVORABLE, SimulationStampQualifier.JUST],
    [69.9, SimulationVerdict.UNFAVORABLE, SimulationStampQualifier.BORDERLINE],
    [65.1, SimulationVerdict.UNFAVORABLE, SimulationStampQualifier.BORDERLINE],
    [65, SimulationVerdict.UNFAVORABLE, SimulationStampQualifier.INSUFFICIENT],
    [40, SimulationVerdict.UNFAVORABLE, SimulationStampQualifier.INSUFFICIENT],
  ])(
    'maps score %s to %s / %s against threshold 70',
    (score, verdict, qualifier) => {
      const stamp = buildSimulationStamp(score, THRESHOLD, false);
      expect(stamp.verdict).toBe(verdict);
      expect(stamp.qualifier).toBe(qualifier);
    },
  );

  it.each([70, 88, 96])(
    'stamps ELIMINATORY when eliminated with a global score at or above the threshold (score %s)',
    (score) => {
      const stamp = buildSimulationStamp(score, THRESHOLD, true);
      expect(stamp.verdict).toBe(SimulationVerdict.UNFAVORABLE);
      expect(stamp.qualifier).toBe(SimulationStampQualifier.ELIMINATORY);
    },
  );

  it.each([
    [67, SimulationStampQualifier.BORDERLINE],
    [55, SimulationStampQualifier.INSUFFICIENT],
  ])(
    'explains an eliminated session under the threshold by its score gap (score %s → %s)',
    (score, qualifier) => {
      const stamp = buildSimulationStamp(score, THRESHOLD, true);
      expect(stamp.verdict).toBe(SimulationVerdict.UNFAVORABLE);
      expect(stamp.qualifier).toBe(qualifier);
    },
  );
});

describe('buildAxisStamp', () => {
  const NON_CRITICAL = { isCritical: false, eliminatoryThreshold: 55 };
  const CRITICAL = { isCritical: true, eliminatoryThreshold: 55 };

  it.each([
    [95, AxisStampWord.EXCELLENT],
    [100, AxisStampWord.EXCELLENT],
    [94.9, AxisStampWord.SOLID],
    [85, AxisStampWord.SOLID],
    [84.9, AxisStampWord.GOOD],
    [70, AxisStampWord.GOOD],
    [69.9, AxisStampWord.FRAGILE],
    [60, AxisStampWord.FRAGILE],
    [59.9, AxisStampWord.WEAK],
    [0, AxisStampWord.WEAK],
  ])('maps score %s to %s for a non-critical axis', (score, word) => {
    expect(buildAxisStamp(score, NON_CRITICAL)).toEqual({
      word,
      isEliminatory: false,
    });
  });

  it('overrides with ELIMINATORY when a critical axis is under its threshold', () => {
    expect(buildAxisStamp(54.9, CRITICAL)).toEqual({
      word: AxisStampWord.ELIMINATORY,
      isEliminatory: true,
    });
  });

  it('keeps the score word for a critical axis at or above its threshold', () => {
    expect(buildAxisStamp(55, CRITICAL)).toEqual({
      word: AxisStampWord.WEAK,
      isEliminatory: false,
    });
    expect(buildAxisStamp(72, CRITICAL)).toEqual({
      word: AxisStampWord.GOOD,
      isEliminatory: false,
    });
  });

  it('never marks a non-critical axis as eliminatory, even far under the threshold', () => {
    expect(buildAxisStamp(20, NON_CRITICAL)).toEqual({
      word: AxisStampWord.WEAK,
      isEliminatory: false,
    });
  });
});
