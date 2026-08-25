import {
  AxisFindingsEntry,
  AxisType,
  RecommendationPriority,
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
import { exampleAxisScores } from './example-axis-detail.fixture';

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

interface FixtureAxis {
  axis: AxisType;
  findings: { id: string; finding: string; recommendation: string }[];
}

const FIXTURE_AXES: FixtureAxis[] = [
  {
    axis: AxisType.LOGIC,
    findings: [
      {
        id: 'logic-time-management',
        finding:
          '6 items jamais atteints alors que vos réponses données sont presque toutes justes',
        recommendation:
          'Passez plus vite sur un item qui résiste : la fonction Passer existe pour ça',
      },
    ],
  },
  {
    axis: AxisType.MEMORY,
    findings: [],
  },
  {
    axis: AxisType.VISUAL_DISCRIMINATION,
    findings: [],
  },
  {
    axis: AxisType.REACTIVITY,
    findings: [
      {
        id: 'reactivity-drift',
        finding:
          'Vos temps de réaction se dégradent de 9 ms par signal sur le dernier tiers',
        recommendation:
          'Travaillez la tenue dans la durée : la fatigue vous coûte plus que la vitesse brute',
      },
    ],
  },
  {
    axis: AxisType.MOTOR_SKILLS,
    findings: [
      {
        id: 'motricity-diagonals',
        finding: '3 sorties sur 4 se produisent dans les tronçons en diagonale',
        recommendation:
          'Entraînez la coordination des deux mains : les diagonales demandent les deux axes à la fois',
      },
      {
        id: 'motricity-unfinished',
        finding: 'Deux parcours sur trois ne sont pas menés à leur terme',
        recommendation:
          'Cherchez la régularité avant la vitesse : un parcours fini proprement vaut mieux',
      },
    ],
  },
];

function isCritical(axis: AxisType): boolean {
  return (AXIS_COEFFICIENT[axis] ?? 1) >= CRITICAL_COEFFICIENT;
}

function weightedGlobalScore(scores: Record<AxisType, number>): number {
  const totals = FIXTURE_AXES.reduce(
    (acc, entry) => {
      const coefficient = AXIS_COEFFICIENT[entry.axis] ?? 1;
      return {
        weighted: acc.weighted + scores[entry.axis] * coefficient,
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

  const axes: SimulationAxisSummaryDto[] = FIXTURE_AXES.map((entry) => ({
    axis: entry.axis,
    score: scores[entry.axis],
    band: avisFromScore(scores[entry.axis]),
    isCritical: isCritical(entry.axis),
    eliminatoryThreshold: isCritical(entry.axis) ? ELIMINATORY_THRESHOLD : null,
    vigilanceThreshold: VIGILANCE_THRESHOLD,
    observables: [],
  }));

  const outcomes = axes.map(({ axis, score, band, isCritical: critical }) => ({
    axis,
    score,
    band,
    isCritical: critical,
  }));

  const findingsByAxis: AxisFindingsEntry[] = FIXTURE_AXES.map((entry) => ({
    axis: entry.axis,
    findings: entry.findings.map((finding) => ({
      ...finding,
      severity: RecommendationPriority.HIGH,
    })),
  }));

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
