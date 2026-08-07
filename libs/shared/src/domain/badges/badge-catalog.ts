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
export const BADGE_PERFECTION_SCORE = 100;
export const BADGE_SECTOR_THRESHOLD = 70;
export const BADGE_EXAM_AXIS_FLOOR = 70;

export const FIRST_STEPS_REWARD = 3;
export const EXAM_FAVORABLE_REWARD = 2;
export const EXAM_GOLD_REWARD = 3;
export const SECTOR_MASTERY_REWARD = 2;
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

function axisBadges(
  axis: AxisType,
  ids: readonly [BadgeId, BadgeId, BadgeId],
  names: readonly [string, string, string],
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
      conditions: [
        bestScoreCondition(
          axis,
          BADGE_PERFECTION_SCORE,
          `Score parfait de ${BADGE_PERFECTION_SCORE}`,
        ),
      ],
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
    ['Déclic', 'Implacable', 'Infaillible'],
  ),
  ...axisBadges(
    AxisType.MEMORY,
    [
      BadgeId.MEMORY_PROGRESSION,
      BadgeId.MEMORY_EXCELLENCE,
      BadgeId.MEMORY_PERFECTION,
    ],
    ['Mémoire vive', "Mémoire d'acier", 'Mémoire absolue'],
  ),
  ...axisBadges(
    AxisType.VISUAL_DISCRIMINATION,
    [
      BadgeId.DISCRIMINATION_PROGRESSION,
      BadgeId.DISCRIMINATION_EXCELLENCE,
      BadgeId.DISCRIMINATION_PERFECTION,
    ],
    ['Bon œil', 'Œil de lynx', 'Vigie'],
  ),
  ...axisBadges(
    AxisType.REACTIVITY,
    [
      BadgeId.REACTIVITY_PROGRESSION,
      BadgeId.REACTIVITY_EXCELLENCE,
      BadgeId.REACTIVITY_PERFECTION,
    ],
    ['Bons réflexes', 'Au quart de tour', 'Sang-froid'],
  ),
  ...axisBadges(
    AxisType.MOTOR_SKILLS,
    [
      BadgeId.MOTOR_PROGRESSION,
      BadgeId.MOTOR_EXCELLENCE,
      BadgeId.MOTOR_PERFECTION,
    ],
    ['Prise en main', 'Main sûre', 'Millimétré'],
  ),
];

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
    energyReward: EXAM_GOLD_REWARD,
    events: [BadgeEvent.SESSION_COMPLETED],
    rarityDenominator: BadgeRarityDenominator.EXAM_FINISHERS,
    conditions: [
      {
        id: 'favorable',
        label: 'Verdict favorable',
        met: (facts) =>
          completedSimulation(facts) &&
          facts.session?.simulation?.verdictFavorable === true,
      },
      {
        id: 'no-axis-under-70',
        label: `Aucun axe sous ${BADGE_EXAM_AXIS_FLOOR}`,
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
