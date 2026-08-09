import { AxisType, Sector, SessionMode } from '../../enums';
import { SECTOR_AXES } from '../sector-axes';
import {
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
export const BADGE_SECTOR_THRESHOLD = 70;
export const EXAM_PROGRESSION_THRESHOLD = 70;
export const EXAM_EXCELLENCE_THRESHOLD = 85;
export const EXAM_PERFECTION_THRESHOLD = 95;

export const FIRST_STEPS_REWARD = 2;
export const EXAM_FAVORABLE_REWARD = 2;
export const EXAM_GOLD_REWARD = 3;
export const SECTOR_MASTERY_REWARD = 3;
export const AXIS_SILVER_REWARD = 1;
export const AXIS_GOLD_REWARD = 2;

export const SECTOR_BADGE_NAMES: Partial<Record<Sector, string>> = {
  [Sector.RAILWAY]: 'Sur les rails',
};

function bestScoreCondition(
  axis: AxisType,
  threshold: number,
  label: string,
): BadgeCondition {
  return {
    id: `best-${threshold}`,
    label,
    met: (facts) => (facts.bestScores[axis] ?? 0) >= threshold,
  };
}

function perfectionCondition(axis: AxisType, label: string): BadgeCondition {
  return {
    id: 'perfection',
    label,
    met: (facts) =>
      facts.session?.axes.some(
        (axisFacts) => axisFacts.axis === axis && axisFacts.perfection,
      ) ?? false,
  };
}

function axisBadges(
  axis: AxisType,
  ids: readonly [BadgeId, BadgeId, BadgeId],
  names: readonly [string, string, string],
  perfectionLabel: string,
): BadgeDefinition[] {
  const common = {
    family: BadgeFamily.AXIS,
    axis,
    rarityDenominator: BadgeRarityDenominator.AXIS_PLAYERS,
    events: [BadgeEvent.SESSION_COMPLETED],
  } as const;
  return [
    {
      ...common,
      id: ids[0],
      tier: BadgeTier.BRONZE,
      displayName: names[0],
      energyReward: 0,
      conditions: [
        bestScoreCondition(
          axis,
          BADGE_PROGRESSION_THRESHOLD,
          `Meilleur score ≥ ${BADGE_PROGRESSION_THRESHOLD}`,
        ),
      ],
    },
    {
      ...common,
      id: ids[1],
      tier: BadgeTier.SILVER,
      displayName: names[1],
      energyReward: AXIS_SILVER_REWARD,
      conditions: [
        bestScoreCondition(
          axis,
          BADGE_EXCELLENCE_THRESHOLD,
          `Meilleur score ≥ ${BADGE_EXCELLENCE_THRESHOLD}`,
        ),
      ],
    },
    {
      ...common,
      id: ids[2],
      tier: BadgeTier.GOLD,
      displayName: names[2],
      energyReward: AXIS_GOLD_REWARD,
      conditions: [perfectionCondition(axis, perfectionLabel)],
    },
  ];
}

const AXIS_BADGES: BadgeDefinition[] = [
  ...axisBadges(
    AxisType.LOGIC,
    [
      BadgeId.LOGIC_PROGRESSION,
      BadgeId.LOGIC_EXCELLENCE,
      BadgeId.LOGIC_PERFECTION,
    ],
    ['Cartésien', 'Esprit affûté', 'Mentaliste'],
    'Toutes les réponses correctes',
  ),
  ...axisBadges(
    AxisType.MEMORY,
    [
      BadgeId.MEMORY_PROGRESSION,
      BadgeId.MEMORY_EXCELLENCE,
      BadgeId.MEMORY_PERFECTION,
    ],
    ['Tête bien pleine', "Mémoire d'éléphant", 'Disque dur'],
    'Une séquence de 8 éléments restituée, ordre normal ou inversé',
  ),
  ...axisBadges(
    AxisType.VISUAL_DISCRIMINATION,
    [
      BadgeId.DISCRIMINATION_PROGRESSION,
      BadgeId.DISCRIMINATION_EXCELLENCE,
      BadgeId.DISCRIMINATION_PERFECTION,
    ],
    ['Fin limier', 'Œil de lynx', 'Radar'],
    'Zéro fausse alerte, zéro cible manquée',
  ),
  ...axisBadges(
    AxisType.REACTIVITY,
    [
      BadgeId.REACTIVITY_PROGRESSION,
      BadgeId.REACTIVITY_EXCELLENCE,
      BadgeId.REACTIVITY_PERFECTION,
    ],
    ['Réflexe', 'Sixième sens', 'Éclair'],
    'Zéro anticipation, zéro omission, zéro mauvaise commande',
  ),
  ...axisBadges(
    AxisType.MOTOR_SKILLS,
    [
      BadgeId.MOTOR_PROGRESSION,
      BadgeId.MOTOR_EXCELLENCE,
      BadgeId.MOTOR_PERFECTION,
    ],
    ['Main sûre', 'Chirurgien', 'Orfèvre'],
    'Parcours terminé sans aucune sortie de couloir',
  ),
];

function completedSimulation(facts: BadgeFacts): boolean {
  return (
    facts.session !== null &&
    facts.session.mode === SessionMode.FULL &&
    facts.session.simulation !== null
  );
}

function examBestScoreCondition(threshold: number): BadgeCondition {
  return {
    id: `exam-best-${threshold}`,
    label: `Meilleur score ≥ ${threshold}`,
    met: (facts) =>
      completedSimulation(facts) &&
      (facts.session?.simulation?.globalScore ?? 0) >= threshold,
  };
}

const EXAM_BADGES: BadgeDefinition[] = [
  {
    id: BadgeId.EXAM_FIRST,
    family: BadgeFamily.EXAM,
    displayName: 'Aguerri',
    axis: null,
    tier: BadgeTier.BRONZE,
    energyReward: 0,
    events: [BadgeEvent.SESSION_COMPLETED],
    rarityDenominator: BadgeRarityDenominator.EXAM_FINISHERS,
    conditions: [examBestScoreCondition(EXAM_PROGRESSION_THRESHOLD)],
  },
  {
    id: BadgeId.EXAM_FAVORABLE,
    family: BadgeFamily.EXAM,
    displayName: 'Certifié',
    axis: null,
    tier: BadgeTier.SILVER,
    energyReward: EXAM_FAVORABLE_REWARD,
    events: [BadgeEvent.SESSION_COMPLETED],
    rarityDenominator: BadgeRarityDenominator.EXAM_FINISHERS,
    conditions: [examBestScoreCondition(EXAM_EXCELLENCE_THRESHOLD)],
  },
  {
    id: BadgeId.EXAM_SOLID,
    family: BadgeFamily.EXAM,
    displayName: 'Premier de la classe',
    axis: null,
    tier: BadgeTier.GOLD,
    energyReward: EXAM_GOLD_REWARD,
    events: [BadgeEvent.SESSION_COMPLETED],
    rarityDenominator: BadgeRarityDenominator.EXAM_FINISHERS,
    conditions: [examBestScoreCondition(EXAM_PERFECTION_THRESHOLD)],
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
    events: [BadgeEvent.ACCOUNT_VERIFIED, BadgeEvent.TUTORIAL_OPENED],
    rarityDenominator: BadgeRarityDenominator.VERIFIED_ACCOUNTS,
    conditions: [
      {
        id: 'verified',
        label: 'Compte vérifié',
        met: (facts) => facts.user.accountVerified,
      },
      {
        id: 'tutorial',
        label: 'Un tutoriel terminé',
        met: (facts) => facts.user.tutorialDiscovered,
      },
    ],
  },
  {
    id: BadgeId.SECTOR_MASTERY,
    family: BadgeFamily.TRANSVERSE,
    displayName: 'Sur les rails',
    axis: null,
    tier: null,
    energyReward: SECTOR_MASTERY_REWARD,
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
  ...AXIS_BADGES,
  ...EXAM_BADGES,
  ...TRANSVERSE_BADGES,
];

export const BADGE_TOTAL_REWARD = BADGE_CATALOG.reduce(
  (sum, definition) => sum + definition.energyReward,
  0,
);

export const BADGE_BY_ID: ReadonlyMap<BadgeId, BadgeDefinition> = new Map(
  BADGE_CATALOG.map((definition) => [definition.id, definition]),
);

export function badgeDisplayName(
  definition: BadgeDefinition,
  sector: Sector,
): string {
  return definition.id === BadgeId.SECTOR_MASTERY
    ? (SECTOR_BADGE_NAMES[sector] ?? definition.displayName)
    : definition.displayName;
}

export function badgesListeningTo(
  event: BadgeEvent,
): readonly BadgeDefinition[] {
  return BADGE_CATALOG.filter((definition) =>
    definition.events.includes(event),
  );
}
