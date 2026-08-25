import {
  AxisType,
  SimulationStampQualifier,
  SimulationVerdict,
  SimulationVerdictReasonKind,
  buildSimulationStamp,
} from '@psychotech/shared';
import { describe, expect, it } from 'vitest';
import { buildExampleBilan } from './example-bilan.fixture';

const COMPLETED_AT = '2026-08-20T18:30:00.000Z';

describe('buildExampleBilan', () => {
  const summary = buildExampleBilan(COMPLETED_AT);

  it('reads as an attainable profile, never as a perfect one', () => {
    expect(summary.axes).toHaveLength(5);
    expect(summary.axes.every((axis) => axis.score < 100)).toBe(true);
    expect(
      summary.axes.some((axis) => axis.score >= 60 && axis.score < 65),
    ).toBe(true);
  });

  it('earns a favourable verdict from the engine, not from a hardcoded value', () => {
    expect(summary.verdict.verdict).toBe(SimulationVerdict.FAVORABLE);
    expect(summary.verdict.reason?.kind).not.toBe(
      SimulationVerdictReasonKind.ELIMINATORY_AXES,
    );
    expect(summary.isAdmissible).toBe(true);
    expect(summary.isEliminated).toBe(false);
    expect(summary.eliminatoryAxes).toEqual([]);
  });

  it('lands the global score in the comfortable bracket, above the threshold but reachable', () => {
    const stamp = buildSimulationStamp(
      summary.globalScore,
      summary.admissibilityThreshold,
      summary.isEliminated,
    );

    expect(stamp.qualifier).toBe(SimulationStampQualifier.COMFORTABLE);
    expect(summary.admissibilityGap).toBeGreaterThanOrEqual(5);
    expect(summary.admissibilityGap).toBeLessThan(15);
  });

  it('derives the synthesis from the axis outcomes', () => {
    const weaknessAxes = summary.selection.weaknesses.map(
      (entry) => entry.axis,
    );

    expect(summary.selection.strengths.length).toBeGreaterThan(0);
    expect(weaknessAxes).toContain(AxisType.MOTOR_SKILLS);
    expect(summary.selection.recommendations.length).toBeGreaterThan(0);
  });

  it('writes an appreciation through the shared engine', () => {
    expect(summary.appreciation.lead.length).toBeGreaterThan(0);
    expect(summary.appreciation.detail.length).toBeGreaterThan(0);
    expect(JSON.stringify(summary.appreciation)).toContain('Ferroviaire');
  });

  it('carries no real identity and no badge celebration', () => {
    expect(summary.earnedBadges).toEqual([]);
    expect(JSON.stringify(summary)).not.toMatch(/Mohand|Boudjema/i);
  });
});
