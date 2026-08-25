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

// Seuils et coefficients du secteur ferroviaire. Ils sont servis par le
// référentiel en session réelle ; l'exemple public les fige pour rester
// autonome, sans appel réseau.
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
  score: number;
  observables: { label: string | null; value: string; caption: string | null }[];
  findings: { id: string; finding: string; recommendation: string }[];
}

// Un profil crédible : solide sans être parfait, avec une motricité qui traîne
// sous le seuil de vigilance. Aucun score à 100, aucun axe éliminatoire.
const FIXTURE_AXES: FixtureAxis[] = [
  {
    axis: AxisType.LOGIC,
    score: 78,
    observables: [
      { label: 'Réussite', value: '31/40', caption: 'items justes' },
      { label: 'Temps moyen', value: '11,4 s', caption: 'par item' },
      { label: 'Profil', value: 'Lent-précis', caption: null },
    ],
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
    score: 84,
    observables: [
      { label: 'Longueur atteinte', value: '7', caption: 'ordre normal' },
      { label: 'Longueur atteinte', value: '5', caption: 'ordre inversé' },
      { label: 'Erreurs', value: 'Position', caption: 'dominantes' },
    ],
    findings: [],
  },
  {
    axis: AxisType.VISUAL_DISCRIMINATION,
    score: 81,
    observables: [
      { label: 'Réponses justes', value: '32/36', caption: null },
      { label: 'Temps moyen', value: '2,6 s', caption: 'par essai' },
      { label: 'Fausses alertes', value: '2', caption: null },
    ],
    findings: [],
  },
  {
    axis: AxisType.REACTIVITY,
    score: 76,
    observables: [
      { label: 'Temps de réaction', value: '452 ms', caption: 'moyenne' },
      { label: 'Régularité', value: '± 78 ms', caption: null },
      { label: 'Erreurs', value: '3', caption: 'sur 45 signaux' },
    ],
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
    score: 62,
    observables: [
      { label: 'Progression', value: '84 %', caption: 'du parcours' },
      { label: 'Sorties', value: '4', caption: 'hors couloir' },
      { label: 'Écart moyen', value: '11 px', caption: 'à la trajectoire' },
    ],
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

function weightedGlobalScore(): number {
  const totals = FIXTURE_AXES.reduce(
    (acc, entry) => {
      const coefficient = AXIS_COEFFICIENT[entry.axis] ?? 1;
      return {
        weighted: acc.weighted + entry.score * coefficient,
        coefficients: acc.coefficients + coefficient,
      };
    },
    { weighted: 0, coefficients: 0 },
  );
  return roundToTenth(totals.weighted / totals.coefficients);
}

// Tout ce qui est interprétation — verdict, tampon, synthèse, recommandations,
// appréciation — sort des fonctions de production. La fixture ne fournit que ce
// qu'une vraie session persiste : des scores et des observables.
export function buildExampleBilan(completedAt: string): SimulationSummaryDto {
  const sector = Sector.RAILWAY;
  const globalScore = weightedGlobalScore();

  const axes: SimulationAxisSummaryDto[] = FIXTURE_AXES.map((entry) => ({
    axis: entry.axis,
    score: entry.score,
    band: avisFromScore(entry.score),
    isCritical: isCritical(entry.axis),
    eliminatoryThreshold: isCritical(entry.axis) ? ELIMINATORY_THRESHOLD : null,
    vigilanceThreshold: VIGILANCE_THRESHOLD,
    observables: entry.observables,
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
