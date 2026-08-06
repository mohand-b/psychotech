import { AxisType, Sector, SessionMode } from '../../enums';
import { SECTOR_AXES } from '../sector-axes';
import {
  BadgeAxisPerfectionFacts,
  BadgeCondition,
  BadgeDefinition,
  BadgeEvent,
  BadgeFacts,
  BadgeFamily,
  BadgeId,
  BadgeRarityDenominator,
  BadgeTier,
} from './badge-model';

export const BADGE_PROGRESSION_THRESHOLD = 70;
export const BADGE_EXCELLENCE_THRESHOLD = 85;
export const BADGE_MEMORY_SPAN_TARGET = 8;
export const BADGE_SECTOR_THRESHOLD = 70;
export const BADGE_EXAM_AXIS_FLOOR = 70;

export const FIRST_STEPS_REWARD = 5;
export const EXAM_FAVORABLE_REWARD = 2;

export const SECTOR_BADGE_NAMES: Record<Sector, string> = {
  [Sector.RAILWAY]: 'Sur les rails',
};

function bestScoreCondition(axis: AxisType, threshold: number): BadgeCondition {
  return {
    id: `best-${threshold}`,
    label: `Meilleur score ≥ ${threshold}`,
    met: (facts) => (facts.bestScores[axis] ?? 0) >= threshold,
  };
}

function perfectionFactsFor(
  facts: BadgeFacts,
  axis: AxisType,
): BadgeAxisPerfectionFacts | null {
  const entry = facts.session?.axes.find((candidate) => candidate.axis === axis);
  return entry?.perfection ?? null;
}

function axisBadges(
  axis: AxisType,
  ids: readonly [BadgeId, BadgeId, BadgeId],
  names: readonly [string, string, string],
  perfectionLabel: string,
  perfectionMet: (facts: BadgeFacts) => boolean,
): BadgeDefinition[] {
  const common = {
    family: BadgeFamily.AXIS,
    axis,
    energyReward: 0,
    rarityDenominator: BadgeRarityDenominator.AXIS_PLAYERS,
    events: [BadgeEvent.SESSION_COMPLETED],
  } as const;
  return [
    {
      ...common,
      id: ids[0],
      tier: BadgeTier.BRONZE,
      displayName: names[0],
      conditions: [bestScoreCondition(axis, BADGE_PROGRESSION_THRESHOLD)],
    },
    {
      ...common,
      id: ids[1],
      tier: BadgeTier.SILVER,
      displayName: names[1],
      conditions: [bestScoreCondition(axis, BADGE_EXCELLENCE_THRESHOLD)],
    },
    {
      ...common,
      id: ids[2],
      tier: BadgeTier.GOLD,
      displayName: names[2],
      conditions: [
        { id: 'perfection', label: perfectionLabel, met: perfectionMet },
      ],
    },
  ];
}

const LOGIC_BADGES = axisBadges(
  AxisType.LOGIC,
  [BadgeId.LOGIC_PROGRESSION, BadgeId.LOGIC_EXCELLENCE, BadgeId.LOGIC_PERFECTION],
  ['Déclic', 'Implacable', 'Infaillible'],
  'Toutes les réponses justes, aucun timeout',
  (facts) => {
    const perfection = perfectionFactsFor(facts, AxisType.LOGIC);
    return (
      perfection?.kind === AxisType.LOGIC &&
      perfection.itemCount > 0 &&
      perfection.correctCount === perfection.itemCount
    );
  },
);

const MEMORY_BADGES = axisBadges(
  AxisType.MEMORY,
  [
    BadgeId.MEMORY_PROGRESSION,
    BadgeId.MEMORY_EXCELLENCE,
    BadgeId.MEMORY_PERFECTION,
  ],
  ['Mémoire vive', "Mémoire d'acier", 'Empan 8'],
  'Une séquence de 8 éléments restituée, ordre normal ou inversé',
  (facts) => {
    const perfection = perfectionFactsFor(facts, AxisType.MEMORY);
    return (
      perfection?.kind === AxisType.MEMORY &&
      perfection.longestPerfectLength >= BADGE_MEMORY_SPAN_TARGET
    );
  },
);

const DISCRIMINATION_BADGES = axisBadges(
  AxisType.VISUAL_DISCRIMINATION,
  [
    BadgeId.DISCRIMINATION_PROGRESSION,
    BadgeId.DISCRIMINATION_EXCELLENCE,
    BadgeId.DISCRIMINATION_PERFECTION,
  ],
  ['Bon œil', 'Œil de lynx', 'Vigie'],
  'Zéro fausse alerte, zéro cible manquée',
  (facts) => {
    const perfection = perfectionFactsFor(
      facts,
      AxisType.VISUAL_DISCRIMINATION,
    );
    return (
      perfection?.kind === AxisType.VISUAL_DISCRIMINATION &&
      perfection.falseAlarmCount === 0 &&
      perfection.missedTargetCount === 0
    );
  },
);

const REACTIVITY_BADGES = axisBadges(
  AxisType.REACTIVITY,
  [
    BadgeId.REACTIVITY_PROGRESSION,
    BadgeId.REACTIVITY_EXCELLENCE,
    BadgeId.REACTIVITY_PERFECTION,
  ],
  ['Bons réflexes', 'Au quart de tour', 'Sang-froid'],
  'Zéro anticipation, zéro omission, zéro mauvaise commande',
  (facts) => {
    const perfection = perfectionFactsFor(facts, AxisType.REACTIVITY);
    return (
      perfection?.kind === AxisType.REACTIVITY &&
      perfection.anticipationCount === 0 &&
      perfection.omissionCount === 0 &&
      perfection.wrongCommandCount === 0
    );
  },
);

const MOTOR_BADGES = axisBadges(
  AxisType.MOTOR_SKILLS,
  [BadgeId.MOTOR_PROGRESSION, BadgeId.MOTOR_EXCELLENCE, BadgeId.MOTOR_PERFECTION],
  ['Prise en main', 'Main sûre', 'Millimétré'],
  'Parcours terminé sans aucune sortie de couloir',
  (facts) => {
    const perfection = perfectionFactsFor(facts, AxisType.MOTOR_SKILLS);
    return (
      perfection?.kind === AxisType.MOTOR_SKILLS &&
      perfection.corridorExitCount === 0
    );
  },
);

function completedSimulation(facts: BadgeFacts): boolean {
  return (
    facts.session !== null &&
    facts.session.mode === SessionMode.FULL &&
    facts.session.simulation !== null
  );
}

const EXAM_BADGES: BadgeDefinition[] = [
  {
    id: BadgeId.EXAM_FIRST,
    family: BadgeFamily.EXAM,
    displayName: 'Baptême',
    axis: null,
    tier: BadgeTier.BRONZE,
    energyReward: 0,
    events: [BadgeEvent.SESSION_COMPLETED],
    rarityDenominator: BadgeRarityDenominator.EXAM_FINISHERS,
    conditions: [
      {
        id: 'first-exam',
        label: 'Terminer un premier examen blanc',
        met: completedSimulation,
      },
    ],
  },
  {
    id: BadgeId.EXAM_FAVORABLE,
    family: BadgeFamily.EXAM,
    displayName: 'Apte',
    axis: null,
    tier: BadgeTier.SILVER,
    energyReward: EXAM_FAVORABLE_REWARD,
    events: [BadgeEvent.SESSION_COMPLETED],
    rarityDenominator: BadgeRarityDenominator.EXAM_FINISHERS,
    conditions: [
      {
        id: 'first-favorable',
        label: 'Premier examen blanc au verdict favorable',
        met: (facts) =>
          completedSimulation(facts) &&
          facts.session?.simulation?.verdictFavorable === true,
      },
    ],
  },
  {
    id: BadgeId.EXAM_SOLID,
    family: BadgeFamily.EXAM,
    displayName: 'Sans réserve',
    axis: null,
    tier: BadgeTier.GOLD,
    energyReward: 0,
    events: [BadgeEvent.SESSION_COMPLETED],
    rarityDenominator: BadgeRarityDenominator.EXAM_FINISHERS,
    conditions: [
      {
        id: 'favorable-solid',
        label: 'Verdict favorable avec qualificatif Solide',
        met: (facts) =>
          completedSimulation(facts) &&
          facts.session?.simulation?.verdictFavorable === true &&
          facts.session.simulation.qualifierAtLeastSolid,
      },
      {
        id: 'no-axis-under-70',
        label: `Aucun axe sous ${BADGE_EXAM_AXIS_FLOOR} dans ce même examen`,
        met: (facts) =>
          completedSimulation(facts) &&
          (facts.session?.axes.length ?? 0) > 0 &&
          (facts.session?.axes.every(
            (axis) => axis.score >= BADGE_EXAM_AXIS_FLOOR,
          ) ??
            false),
      },
    ],
  },
];

const TRANSVERSE_BADGES: BadgeDefinition[] = [
  {
    id: BadgeId.FIRST_STEPS,
    family: BadgeFamily.TRANSVERSE,
    displayName: 'Premiers pas',
    axis: null,
    tier: null,
    energyReward: FIRST_STEPS_REWARD,
    events: [
      BadgeEvent.ACCOUNT_VERIFIED,
      BadgeEvent.TUTORIAL_OPENED,
      BadgeEvent.SESSION_STARTED,
    ],
    rarityDenominator: BadgeRarityDenominator.VERIFIED_ACCOUNTS,
    conditions: [
      {
        id: 'verified',
        label: 'Compte vérifié',
        met: (facts) => facts.user.accountVerified,
      },
      {
        id: 'tutorial',
        label: 'Un tutoriel découvert',
        met: (facts) => facts.user.tutorialDiscovered,
      },
      {
        id: 'session-started',
        label: 'Une première session lancée',
        met: (facts) => facts.user.sessionStarted,
      },
    ],
  },
  {
    id: BadgeId.SECTOR_MASTERY,
    family: BadgeFamily.TRANSVERSE,
    displayName: 'Sur les rails',
    axis: null,
    tier: null,
    energyReward: 0,
    events: [BadgeEvent.SESSION_COMPLETED],
    rarityDenominator: BadgeRarityDenominator.SESSION_FINISHERS,
    conditions: [
      {
        id: 'all-axes-70',
        label: `Meilleur score ≥ ${BADGE_SECTOR_THRESHOLD} sur tous les axes du secteur`,
        met: (facts) =>
          SECTOR_AXES[facts.sector].every(
            (axis) => (facts.bestScores[axis] ?? 0) >= BADGE_SECTOR_THRESHOLD,
          ),
      },
    ],
  },
];

export const BADGE_CATALOG: readonly BadgeDefinition[] = [
  ...LOGIC_BADGES,
  ...MEMORY_BADGES,
  ...DISCRIMINATION_BADGES,
  ...REACTIVITY_BADGES,
  ...MOTOR_BADGES,
  ...EXAM_BADGES,
  ...TRANSVERSE_BADGES,
];

export const BADGE_BY_ID: ReadonlyMap<BadgeId, BadgeDefinition> = new Map(
  BADGE_CATALOG.map((definition) => [definition.id, definition]),
);

export function badgeDisplayName(
  definition: BadgeDefinition,
  sector: Sector,
): string {
  return definition.id === BadgeId.SECTOR_MASTERY
    ? SECTOR_BADGE_NAMES[sector]
    : definition.displayName;
}

export function badgesListeningTo(
  event: BadgeEvent,
): readonly BadgeDefinition[] {
  return BADGE_CATALOG.filter((definition) =>
    definition.events.includes(event),
  );
}
