import { AxisType, RecommendationPriority, ScoreBand } from '../enums';
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
        {
          axis: AxisType.LOGIC,
          priority: RecommendationPriority.HIGH,
          label: 'reco logique',
        },
        {
          axis: AxisType.MEMORY,
          priority: RecommendationPriority.HIGH,
          label: 'reco mémoire',
        },
        {
          axis: AxisType.VISUAL_DISCRIMINATION,
          priority: RecommendationPriority.HIGH,
          label: 'reco discrimination',
        },
        {
          axis: AxisType.REACTIVITY,
          priority: RecommendationPriority.HIGH,
          label: 'reco réactivité',
        },
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

  it('sorts recommendations by priority then ascending axis score', () => {
    const summary = buildSimulationSummary(
      [
        outcome(AxisType.LOGIC, 62, ScoreBand.FRAGILE),
        outcome(AxisType.MEMORY, 58, ScoreBand.INSUFFICIENT, true),
        outcome(AxisType.VISUAL_DISCRIMINATION, 64, ScoreBand.FRAGILE, true),
        outcome(AxisType.REACTIVITY, 68, ScoreBand.FRAGILE),
        outcome(AxisType.MOTOR_SKILLS, 85, ScoreBand.EXCELLENT),
      ],
      THRESHOLDS,
      [
        {
          axis: AxisType.REACTIVITY,
          priority: RecommendationPriority.LOW,
          label: 'reco réactivité',
        },
        {
          axis: AxisType.LOGIC,
          priority: RecommendationPriority.MEDIUM,
          label: 'reco logique',
        },
        {
          axis: AxisType.VISUAL_DISCRIMINATION,
          priority: RecommendationPriority.HIGH,
          label: 'reco discrimination',
        },
        {
          axis: AxisType.MEMORY,
          priority: RecommendationPriority.HIGH,
          label: 'reco mémoire',
        },
      ],
    );

    expect(summary.recommendations).toEqual([
      { axis: AxisType.MEMORY, label: 'reco mémoire' },
      { axis: AxisType.VISUAL_DISCRIMINATION, label: 'reco discrimination' },
      { axis: AxisType.LOGIC, label: 'reco logique' },
    ]);
  });
});
