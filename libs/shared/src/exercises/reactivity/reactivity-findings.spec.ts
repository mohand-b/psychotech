import { describe, expect, it } from 'vitest';
import { RecommendationPriority } from '../../enums';
import { analyzeReactivity } from './reactivity-findings';
import {
  ReactivitySessionScore,
  ReactivityStimulusPoint,
} from './reactivity-scoring';
import { ReactivityClassification } from './reactivity-stimulus';

function point(
  appearAtMs: number,
  classification: ReactivityClassification,
  trMs: number | null,
): ReactivityStimulusPoint {
  return { appearAtMs, trMs, classification };
}

function score(
  overrides: Partial<ReactivitySessionScore>,
): ReactivitySessionScore {
  return {
    score: 70,
    classifications: [],
    trMoyMs: 400,
    sdMs: 50,
    wrongCommandCount: 0,
    anticipationCount: 0,
    omissionCount: 0,
    points: [],
    trend: [],
    ...overrides,
  };
}

function ids(scored: ReactivitySessionScore): string[] {
  return analyzeReactivity(scored).map(({ id }) => id);
}

describe('analyzeReactivity', () => {
  it('flags a post-error slowdown against the clean baseline', () => {
    const points = [
      point(2_000, 'VALID', 350),
      point(4_000, 'VALID', 360),
      point(6_000, 'VALID', 340),
      point(8_000, 'WRONG_COMMAND', 380),
      point(10_000, 'VALID', 480),
      point(12_000, 'VALID', 460),
      point(14_000, 'VALID', 470),
      point(16_000, 'VALID', 350),
    ];
    const scored = score({ points, wrongCommandCount: 1 });
    const findings = analyzeReactivity(scored);
    const slowdown = findings.find(
      ({ id }) => id === 'REACTIVITY_POST_ERROR_SLOWDOWN',
    );
    expect(slowdown).toBeDefined();
    expect(slowdown?.severity).toBe(RecommendationPriority.HIGH);
    expect(slowdown?.finding).toContain('470 ms');
    expect(slowdown?.finding).toContain('350 ms');
  });

  it('stays silent on post-error slowdown when the rhythm holds after errors', () => {
    const points = [
      point(2_000, 'VALID', 350),
      point(4_000, 'VALID', 360),
      point(6_000, 'WRONG_COMMAND', 380),
      point(8_000, 'VALID', 355),
      point(10_000, 'VALID', 345),
      point(12_000, 'VALID', 350),
      point(14_000, 'VALID', 360),
    ];
    expect(ids(score({ points, wrongCommandCount: 1 }))).not.toContain(
      'REACTIVITY_POST_ERROR_SLOWDOWN',
    );
  });

  it('flags an intra-trial fatigue slope from the trend', () => {
    const trend = [340, 345, 350, 420, 430, 440].map((trMs, position) => ({
      appearAtMs: position * 20_000,
      trMs,
    }));
    const findings = analyzeReactivity(score({ trend }));
    const fatigue = findings.find(({ id }) => id === 'REACTIVITY_FATIGUE_SLOPE');
    expect(fatigue).toBeDefined();
    expect(fatigue?.finding).toMatch(/345 ms à 430 ms/);
  });

  it('stays silent on fatigue for a flat trend', () => {
    const trend = [350, 348, 352, 351, 349, 350].map((trMs, position) => ({
      appearAtMs: position * 20_000,
      trMs,
    }));
    expect(ids(score({ trend }))).not.toContain('REACTIVITY_FATIGUE_SLOPE');
  });

  it('flags wrong commands concentrated in phase three', () => {
    const points = [
      point(30_000, 'WRONG_COMMAND', 400),
      point(125_000, 'WRONG_COMMAND', 420),
      point(150_000, 'WRONG_COMMAND', 430),
    ];
    const findings = analyzeReactivity(
      score({ points, wrongCommandCount: 3 }),
    );
    const phase3 = findings.find(({ id }) => id === 'REACTIVITY_PHASE3_ERRORS');
    expect(phase3).toBeDefined();
    expect(phase3?.finding).toContain('2 de vos 3 mauvaises commandes');
  });

  it('stays silent when wrong commands spread across phases', () => {
    const points = [
      point(30_000, 'WRONG_COMMAND', 400),
      point(70_000, 'WRONG_COMMAND', 420),
      point(150_000, 'WRONG_COMMAND', 430),
    ];
    expect(
      ids(score({ points, wrongCommandCount: 3 })),
    ).not.toContain('REACTIVITY_PHASE3_ERRORS');
  });

  it('flags repeated anticipations and stays silent on a single one', () => {
    expect(ids(score({ anticipationCount: 3 }))).toContain(
      'REACTIVITY_ANTICIPATIONS',
    );
    expect(ids(score({ anticipationCount: 1 }))).not.toContain(
      'REACTIVITY_ANTICIPATIONS',
    );
  });

  it('flags irregular reactions and stays silent on steady ones', () => {
    expect(ids(score({ trMoyMs: 400, sdMs: 140 }))).toContain(
      'REACTIVITY_IRREGULARITY',
    );
    expect(ids(score({ trMoyMs: 400, sdMs: 90 }))).not.toContain(
      'REACTIVITY_IRREGULARITY',
    );
  });

  it('flags a brutal step between phase two and phase three', () => {
    const points = [
      point(70_000, 'VALID', 350),
      point(90_000, 'VALID', 360),
      point(130_000, 'VALID', 430),
      point(150_000, 'VALID', 440),
    ];
    const findings = analyzeReactivity(score({ points }));
    const step = findings.find(({ id }) => id === 'REACTIVITY_PHASE_STEP');
    expect(step).toBeDefined();
    expect(step?.finding).toContain('355 ms');
    expect(step?.finding).toContain('435 ms');
  });

  it('stays silent on the phase step when both phases align', () => {
    const points = [
      point(70_000, 'VALID', 350),
      point(90_000, 'VALID', 360),
      point(130_000, 'VALID', 370),
      point(150_000, 'VALID', 380),
    ];
    expect(ids(score({ points }))).not.toContain('REACTIVITY_PHASE_STEP');
  });

  it('sorts the findings by severity', () => {
    const points = [
      point(2_000, 'VALID', 350),
      point(4_000, 'VALID', 360),
      point(6_000, 'VALID', 340),
      point(8_000, 'WRONG_COMMAND', 380),
      point(10_000, 'VALID', 480),
      point(12_000, 'VALID', 460),
      point(14_000, 'VALID', 470),
    ];
    const findings = analyzeReactivity(
      score({ points, wrongCommandCount: 1, anticipationCount: 2 }),
    );
    const severities = findings.map(({ severity }) => severity);
    expect(severities[0]).toBe(RecommendationPriority.HIGH);
    expect([...severities].sort()).not.toEqual([]);
    for (let index = 1; index < severities.length; index += 1) {
      const rank = (severity: RecommendationPriority) =>
        severity === RecommendationPriority.HIGH
          ? 0
          : severity === RecommendationPriority.MEDIUM
            ? 1
            : 2;
      expect(rank(severities[index])).toBeGreaterThanOrEqual(
        rank(severities[index - 1]),
      );
    }
  });
});
