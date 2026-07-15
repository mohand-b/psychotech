import { AxisType, RecommendationPriority, ScoreBand } from '../enums';
import { AxisFinding } from '../exercises/axis-findings';
import {
  SimulationAxisOutcome,
  SimulationThresholdKind,
  buildSimulationSummary,
} from './simulation-summary';

const THRESHOLDS = { vigilanceThreshold: 65, eliminatoryThreshold: 55 };

function outcome(
  axis: AxisType,
  score: number,
  band: ScoreBand,
  isCritical = false,
): SimulationAxisOutcome {
  return { axis, score, band, isCritical };
}

function finding(
  id: string,
  severity: RecommendationPriority = RecommendationPriority.MEDIUM,
): AxisFinding {
  return {
    id,
    severity,
    finding: `constat ${id}`,
    recommendation: `reco ${id}`,
  };
}

describe('buildSimulationSummary', () => {
  it('puts eliminatory axes before vigilance axes whatever their score', () => {
    const summary = buildSimulationSummary(
      [
        outcome(AxisType.LOGIC, 40, ScoreBand.INSUFFICIENT),
        outcome(AxisType.MEMORY, 50, ScoreBand.INSUFFICIENT, true),
        outcome(AxisType.VISUAL_DISCRIMINATION, 60, ScoreBand.FRAGILE),
        outcome(AxisType.REACTIVITY, 75, ScoreBand.ACCEPTABLE, true),
        outcome(AxisType.MOTOR_SKILLS, 82, ScoreBand.EXCELLENT),
      ],
      THRESHOLDS,
      [],
    );

    expect(summary.weaknesses.map(({ axis }) => axis)).toEqual([
      AxisType.MEMORY,
      AxisType.LOGIC,
      AxisType.VISUAL_DISCRIMINATION,
    ]);
    expect(summary.weaknesses[0]).toMatchObject({
      thresholdKind: SimulationThresholdKind.ELIMINATORY,
      thresholdValue: 55,
    });
    expect(summary.weaknesses[1]).toMatchObject({
      thresholdKind: SimulationThresholdKind.VIGILANCE,
      thresholdValue: 65,
    });
  });

  it('caps strengths at two, weaknesses at three and recommendations at three', () => {
    const summary = buildSimulationSummary(
      [
        outcome(AxisType.LOGIC, 40, ScoreBand.INSUFFICIENT, true),
        outcome(AxisType.MEMORY, 45, ScoreBand.INSUFFICIENT, true),
        outcome(AxisType.VISUAL_DISCRIMINATION, 50, ScoreBand.INSUFFICIENT, true),
        outcome(AxisType.REACTIVITY, 52, ScoreBand.INSUFFICIENT, true),
        outcome(AxisType.MOTOR_SKILLS, 60, ScoreBand.FRAGILE),
      ],
      THRESHOLDS,
      [
        { axis: AxisType.LOGIC, findings: [finding('logic')] },
        { axis: AxisType.MEMORY, findings: [finding('memory')] },
        {
          axis: AxisType.VISUAL_DISCRIMINATION,
          findings: [finding('discrimination')],
        },
        { axis: AxisType.REACTIVITY, findings: [finding('reactivity')] },
      ],
    );

    expect(summary.strengths).toHaveLength(0);
    expect(summary.weaknesses).toHaveLength(3);
    expect(summary.recommendations).toHaveLength(3);
  });

  it('keeps the two best excellent axes as strengths, best first', () => {
    const summary = buildSimulationSummary(
      [
        outcome(AxisType.LOGIC, 82, ScoreBand.EXCELLENT),
        outcome(AxisType.MEMORY, 60, ScoreBand.FRAGILE),
        outcome(AxisType.VISUAL_DISCRIMINATION, 88, ScoreBand.EXCELLENT),
        outcome(AxisType.REACTIVITY, 70, ScoreBand.ACCEPTABLE),
        outcome(AxisType.MOTOR_SKILLS, 84, ScoreBand.EXCELLENT),
      ],
      THRESHOLDS,
      [],
    );

    expect(summary.strengths.map(({ axis }) => axis)).toEqual([
      AxisType.VISUAL_DISCRIMINATION,
      AxisType.MOTOR_SKILLS,
    ]);
  });

  it('selects no strength when no axis reaches a green avis', () => {
    const summary = buildSimulationSummary(
      [
        outcome(AxisType.LOGIC, 79, ScoreBand.ACCEPTABLE),
        outcome(AxisType.MEMORY, 75, ScoreBand.ACCEPTABLE),
        outcome(AxisType.VISUAL_DISCRIMINATION, 72, ScoreBand.ACCEPTABLE),
        outcome(AxisType.REACTIVITY, 70, ScoreBand.ACCEPTABLE),
        outcome(AxisType.MOTOR_SKILLS, 71, ScoreBand.ACCEPTABLE),
      ],
      THRESHOLDS,
      [],
    );

    expect(summary.strengths).toHaveLength(0);
    expect(summary.weaknesses).toHaveLength(0);
  });

  it('orders next-step axes by threshold severity then ascending score', () => {
    const summary = buildSimulationSummary(
      [
        outcome(AxisType.LOGIC, 62, ScoreBand.FRAGILE),
        outcome(AxisType.MEMORY, 50, ScoreBand.INSUFFICIENT, true),
        outcome(AxisType.VISUAL_DISCRIMINATION, 64, ScoreBand.FRAGILE, true),
        outcome(AxisType.REACTIVITY, 68, ScoreBand.FRAGILE),
        outcome(AxisType.MOTOR_SKILLS, 85, ScoreBand.EXCELLENT),
      ],
      THRESHOLDS,
      [
        { axis: AxisType.REACTIVITY, findings: [finding('reactivity')] },
        { axis: AxisType.LOGIC, findings: [finding('logic')] },
        {
          axis: AxisType.VISUAL_DISCRIMINATION,
          findings: [finding('discrimination')],
        },
        { axis: AxisType.MEMORY, findings: [finding('memory')] },
      ],
    );

    expect(summary.recommendations.map(({ axis }) => axis)).toEqual([
      AxisType.MEMORY,
      AxisType.LOGIC,
      AxisType.VISUAL_DISCRIMINATION,
    ]);
  });

  it('skips axes without findings and caps each card at three findings', () => {
    const summary = buildSimulationSummary(
      [
        outcome(AxisType.LOGIC, 62, ScoreBand.FRAGILE),
        outcome(AxisType.MEMORY, 58, ScoreBand.INSUFFICIENT, true),
        outcome(AxisType.MOTOR_SKILLS, 85, ScoreBand.EXCELLENT),
      ],
      THRESHOLDS,
      [
        { axis: AxisType.LOGIC, findings: [] },
        {
          axis: AxisType.MEMORY,
          findings: [
            finding('a', RecommendationPriority.LOW),
            finding('b', RecommendationPriority.HIGH),
            finding('c', RecommendationPriority.MEDIUM),
            finding('d', RecommendationPriority.MEDIUM),
          ],
        },
        { axis: AxisType.MOTOR_SKILLS, findings: [finding('motor')] },
      ],
    );

    expect(summary.recommendations.map(({ axis }) => axis)).toEqual([
      AxisType.MEMORY,
      AxisType.MOTOR_SKILLS,
    ]);
    expect(summary.recommendations[0].findings).toHaveLength(3);
    expect(summary.recommendations[0].findings[0].id).toBe('b');
  });
});
