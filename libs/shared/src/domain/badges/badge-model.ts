import { AxisType, Sector, SessionMode } from '../../enums';

export enum BadgeId {
  LOGIC_PROGRESSION = 'LOGIC_PROGRESSION',
  LOGIC_EXCELLENCE = 'LOGIC_EXCELLENCE',
  LOGIC_PERFECTION = 'LOGIC_PERFECTION',
  MEMORY_PROGRESSION = 'MEMORY_PROGRESSION',
  MEMORY_EXCELLENCE = 'MEMORY_EXCELLENCE',
  MEMORY_PERFECTION = 'MEMORY_PERFECTION',
  DISCRIMINATION_PROGRESSION = 'DISCRIMINATION_PROGRESSION',
  DISCRIMINATION_EXCELLENCE = 'DISCRIMINATION_EXCELLENCE',
  DISCRIMINATION_PERFECTION = 'DISCRIMINATION_PERFECTION',
  REACTIVITY_PROGRESSION = 'REACTIVITY_PROGRESSION',
  REACTIVITY_EXCELLENCE = 'REACTIVITY_EXCELLENCE',
  REACTIVITY_PERFECTION = 'REACTIVITY_PERFECTION',
  MOTOR_PROGRESSION = 'MOTOR_PROGRESSION',
  MOTOR_EXCELLENCE = 'MOTOR_EXCELLENCE',
  MOTOR_PERFECTION = 'MOTOR_PERFECTION',
  EXAM_FIRST = 'EXAM_FIRST',
  EXAM_FAVORABLE = 'EXAM_FAVORABLE',
  EXAM_SOLID = 'EXAM_SOLID',
  FIRST_STEPS = 'FIRST_STEPS',
  SECTOR_MASTERY = 'SECTOR_MASTERY',
}

export enum BadgeFamily {
  AXIS = 'AXIS',
  EXAM = 'EXAM',
  TRANSVERSE = 'TRANSVERSE',
}

export enum BadgeTier {
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
}

export enum BadgeEvent {
  SESSION_COMPLETED = 'SESSION_COMPLETED',
  ACCOUNT_VERIFIED = 'ACCOUNT_VERIFIED',
  TUTORIAL_OPENED = 'TUTORIAL_OPENED',
}

export enum BadgeRarityDenominator {
  AXIS_PLAYERS = 'AXIS_PLAYERS',
  EXAM_FINISHERS = 'EXAM_FINISHERS',
  SESSION_FINISHERS = 'SESSION_FINISHERS',
  VERIFIED_ACCOUNTS = 'VERIFIED_ACCOUNTS',
}

export interface BadgeUserFacts {
  accountVerified: boolean;
  tutorialDiscovered: boolean;
}


export interface BadgeSessionAxisFacts {
  axis: AxisType;
  score: number;
  perfection: boolean;
  exitFree: boolean;
}

export interface BadgeSimulationFacts {
  globalScore: number;
  verdictFavorable: boolean;
}

export interface BadgeSessionFacts {
  mode: SessionMode;
  axes: BadgeSessionAxisFacts[];
  simulation: BadgeSimulationFacts | null;
}

export interface BadgeFacts {
  sector: Sector;
  bestScores: Partial<Record<AxisType, number>>;
  user: BadgeUserFacts;
  session: BadgeSessionFacts | null;
}

export interface BadgeCondition {
  id: string;
  label: string;
  met: (facts: BadgeFacts) => boolean;
}

export interface BadgeDefinition {
  id: BadgeId;
  family: BadgeFamily;
  displayName: string;
  axis: AxisType | null;
  tier: BadgeTier | null;
  energyReward: number;
  events: readonly BadgeEvent[];
  rarityDenominator: BadgeRarityDenominator;
  conditions: readonly BadgeCondition[];
}

export function badgeEarned(
  definition: BadgeDefinition,
  facts: BadgeFacts,
): boolean {
  return definition.conditions.every((condition) => condition.met(facts));
}
