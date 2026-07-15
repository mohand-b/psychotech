import { describe, expect, it } from 'vitest';
import { RecommendationPriority } from '../../enums';
import { analyzeDiscrimination } from './discrimination-findings';
import {
  DiscriminationOutcome,
  DiscriminationSessionScore,
} from './discrimination-scoring';

function score(
  overrides: Partial<DiscriminationSessionScore>,
): DiscriminationSessionScore {
  return {
    score: 70,
    outcomes: [],
    correctCount: 0,
    wrongIdenticalCount: 0,
    wrongDifferentCount: 0,
    unansweredCount: 0,
    avgAnswerTimeMs: 900,
    correctAnswerAvgMs: 900,
    wrongAnswerAvgMs: 900,
    ...overrides,
  };
}

function ids(scored: DiscriminationSessionScore): string[] {
  return analyzeDiscrimination(scored).map(({ id }) => id);
}

describe('analyzeDiscrimination', () => {
  it('flags the identical bias when differences are missed', () => {
    const findings = analyzeDiscrimination(
      score({ wrongIdenticalCount: 4, wrongDifferentCount: 1 }),
    );
    const bias = findings.find(({ id }) => id === 'DISCRIMINATION_BIAS_IDENTICAL');
    expect(bias).toBeDefined();
    expect(bias?.finding).toContain('4 paires différentes jugées « identiques »');
  });

  it('flags the different bias on excess false alarms', () => {
    const findings = analyzeDiscrimination(
      score({ wrongIdenticalCount: 1, wrongDifferentCount: 4 }),
    );
    const bias = findings.find(({ id }) => id === 'DISCRIMINATION_BIAS_DIFFERENT');
    expect(bias).toBeDefined();
    expect(bias?.finding).toContain('4 paires identiques jugées « différentes »');
  });

  it('stays silent on bias when both error kinds balance', () => {
    expect(
      ids(score({ wrongIdenticalCount: 3, wrongDifferentCount: 2 })),
    ).toEqual(
      expect.not.arrayContaining([
        'DISCRIMINATION_BIAS_IDENTICAL',
        'DISCRIMINATION_BIAS_DIFFERENT',
      ]),
    );
  });

  it('flags the fast-but-wrong trade-off', () => {
    const findings = analyzeDiscrimination(
      score({
        wrongIdenticalCount: 2,
        wrongDifferentCount: 1,
        correctAnswerAvgMs: 1_000,
        wrongAnswerAvgMs: 550,
      }),
    );
    const rush = findings.find(({ id }) => id === 'DISCRIMINATION_RUSH');
    expect(rush).toBeDefined();
    expect(rush?.finding).toContain('550 ms');
    expect(rush?.finding).toContain('1000 ms');
  });

  it('flags the slow-but-accurate trade-off', () => {
    const outcomes = Array.from(
      { length: 30 },
      () => 'TRUE_POSITIVE' as DiscriminationOutcome,
    );
    const findings = analyzeDiscrimination(
      score({
        outcomes,
        correctCount: 26,
        unansweredCount: 4,
        wrongIdenticalCount: 0,
        wrongDifferentCount: 0,
      }),
    );
    const slow = findings.find(
      ({ id }) => id === 'DISCRIMINATION_SLOW_ACCURATE',
    );
    expect(slow).toBeDefined();
    expect(slow?.severity).toBe(RecommendationPriority.HIGH);
    expect(slow?.finding).toContain('4 essais jamais atteints');
  });

  it('stays silent on the trade-off for a balanced session', () => {
    const outcomes = Array.from(
      { length: 30 },
      () => 'TRUE_POSITIVE' as DiscriminationOutcome,
    );
    expect(
      ids(
        score({
          outcomes,
          correctCount: 28,
          unansweredCount: 1,
          wrongIdenticalCount: 1,
          correctAnswerAvgMs: 900,
          wrongAnswerAvgMs: 850,
        }),
      ),
    ).toEqual(
      expect.not.arrayContaining([
        'DISCRIMINATION_RUSH',
        'DISCRIMINATION_SLOW_ACCURATE',
      ]),
    );
  });

  it('flags a vigilance drop concentrated on the last third', () => {
    const outcomes: DiscriminationOutcome[] = [
      ...Array.from({ length: 10 }, () => 'TRUE_NEGATIVE' as DiscriminationOutcome),
      ...Array.from({ length: 10 }, () => 'TRUE_POSITIVE' as DiscriminationOutcome),
      'FALSE_POSITIVE',
      'FALSE_NEGATIVE',
      'FALSE_POSITIVE',
      ...Array.from({ length: 7 }, () => 'TRUE_POSITIVE' as DiscriminationOutcome),
    ];
    const findings = analyzeDiscrimination(score({ outcomes }));
    const drop = findings.find(
      ({ id }) => id === 'DISCRIMINATION_VIGILANCE_DROP',
    );
    expect(drop).toBeDefined();
    expect(drop?.finding).toContain('3 erreurs sur le dernier tiers');
  });

  it('stays silent on vigilance when errors open the session instead', () => {
    const outcomes: DiscriminationOutcome[] = [
      'FALSE_POSITIVE',
      'FALSE_NEGATIVE',
      ...Array.from({ length: 28 }, () => 'TRUE_POSITIVE' as DiscriminationOutcome),
    ];
    expect(ids(score({ outcomes }))).not.toContain(
      'DISCRIMINATION_VIGILANCE_DROP',
    );
  });
});
