import {
  AxisFindingsEntry,
  AxisType,
  SECTOR_LABELS,
  Sector,
  SimulationAxisSummaryDto,
  SimulationSummaryDto,
  avisFromScore,
  buildSimulationAppreciation,
  buildSimulationSummary,
  computeSimulationVerdict,
  roundToTenth,
} from '@psychotech/shared';
import {
  exampleAxisFindings,
  exampleAxisScores,
} from './example-axis-detail.fixture';

const ADMISSIBILITY_THRESHOLD = 70;
const VIGILANCE_THRESHOLD = 65;
const ELIMINATORY_THRESHOLD = 55;

const AXIS_COEFFICIENT: Record<string, number> = {
  [AxisType.LOGIC]: 1,
  [AxisType.MEMORY]: 1.2,
  [AxisType.VISUAL_DISCRIMINATION]: 1.2,
  [AxisType.REACTIVITY]: 1.4,
  [AxisType.MOTOR_SKILLS]: 1,
};

const CRITICAL_COEFFICIENT = 1.2;

const EXAMPLE_AXIS_ORDER: AxisType[] = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

function isCritical(axis: AxisType): boolean {
  return (AXIS_COEFFICIENT[axis] ?? 1) >= CRITICAL_COEFFICIENT;
}

function weightedGlobalScore(scores: Record<AxisType, number>): number {
  const totals = EXAMPLE_AXIS_ORDER.reduce(
    (acc, axis) => {
      const coefficient = AXIS_COEFFICIENT[axis] ?? 1;
      return {
        weighted: acc.weighted + scores[axis] * coefficient,
        coefficients: acc.coefficients + coefficient,
      };
    },
    { weighted: 0, coefficients: 0 },
  );
  return roundToTenth(totals.weighted / totals.coefficients);
}

export function buildExampleBilan(completedAt: string): SimulationSummaryDto {
  const sector = Sector.RAILWAY;
  const scores = exampleAxisScores();
  const globalScore = weightedGlobalScore(scores);

  const axes: SimulationAxisSummaryDto[] = EXAMPLE_AXIS_ORDER.map((axis) => ({
    axis,
    score: scores[axis],
    band: avisFromScore(scores[axis]),
    isCritical: isCritical(axis),
    eliminatoryThreshold: isCritical(axis) ? ELIMINATORY_THRESHOLD : null,
    vigilanceThreshold: VIGILANCE_THRESHOLD,
    observables: [],
  }));

  const outcomes = axes.map(({ axis, score, band, isCritical: critical }) => ({
    axis,
    score,
    band,
    isCritical: critical,
  }));

  const findingsByAxis: AxisFindingsEntry[] = exampleAxisFindings();

  const selection = buildSimulationSummary(
    outcomes,
    {
      vigilanceThreshold: VIGILANCE_THRESHOLD,
      eliminatoryThreshold: ELIMINATORY_THRESHOLD,
    },
    findingsByAxis,
  );

  const eliminatoryAxes = outcomes
    .filter((entry) => entry.isCritical && entry.score < ELIMINATORY_THRESHOLD)
    .map((entry) => entry.axis);

  return {
    sessionId: 'exemple-de-bilan',
    earnedBadges: [],
    sector,
    completedAt,
    globalScore,
    globalBand: avisFromScore(globalScore),
    isAdmissible: globalScore >= ADMISSIBILITY_THRESHOLD,
    isEliminated: eliminatoryAxes.length > 0,
    verdict: computeSimulationVerdict({
      globalScore,
      admissibilityThreshold: ADMISSIBILITY_THRESHOLD,
      eliminatoryThreshold: ELIMINATORY_THRESHOLD,
      axes: outcomes,
    }),
    admissibilityThreshold: ADMISSIBILITY_THRESHOLD,
    admissibilityGap: roundToTenth(globalScore - ADMISSIBILITY_THRESHOLD),
    eliminatoryAxes,
    axes,
    selection,
    appreciation: buildSimulationAppreciation(
      {
        sectorLabel: SECTOR_LABELS[sector],
        globalScore,
        admissibilityThreshold: ADMISSIBILITY_THRESHOLD,
        eliminatoryThreshold: ELIMINATORY_THRESHOLD,
        isEliminated: eliminatoryAxes.length > 0,
      },
      outcomes,
      selection,
      findingsByAxis,
    ),
  };
}
