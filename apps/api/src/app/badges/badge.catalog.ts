import { BadgeCategory } from '@prisma/client';

export interface BadgeEvaluationState {
  currentStreak: number;
  completedSessions: number;
  hasCompletedFullSession: boolean;
  bestGlobalScore: number | null;
  bestAxisScore: number | null;
  completedAxesCount: number;
  flawlessVisualDiscrimination: boolean;
}

export interface BadgeDefinition {
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
  isUnlocked: (state: BadgeEvaluationState) => boolean;
}

const STREAK_THRESHOLD_7 = 7;
const STREAK_THRESHOLD_14 = 14;
const STREAK_THRESHOLD_30 = 30;
const STREAK_THRESHOLD_60 = 60;
const STREAK_THRESHOLD_100 = 100;
const GLOBAL_SCORE_THRESHOLD_70 = 70;
const GLOBAL_SCORE_THRESHOLD_80 = 80;
const PERFECT_AXIS_SCORE = 100;
const VOLUME_THRESHOLD_10 = 10;
const VOLUME_THRESHOLD_50 = 50;
const REQUIRED_AXES_COUNT = 5;

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    code: 'STREAK_7',
    name: 'Série de 7 jours',
    description: 'Atteignez une série de 7 jours consécutifs.',
    category: BadgeCategory.STREAK,
    icon: 'flame',
    isUnlocked: (state) => state.currentStreak >= STREAK_THRESHOLD_7,
  },
  {
    code: 'STREAK_14',
    name: 'Série de 14 jours',
    description: 'Atteignez une série de 14 jours consécutifs.',
    category: BadgeCategory.STREAK,
    icon: 'flame',
    isUnlocked: (state) => state.currentStreak >= STREAK_THRESHOLD_14,
  },
  {
    code: 'STREAK_30',
    name: 'Série de 30 jours',
    description: 'Atteignez une série de 30 jours consécutifs.',
    category: BadgeCategory.STREAK,
    icon: 'flame',
    isUnlocked: (state) => state.currentStreak >= STREAK_THRESHOLD_30,
  },
  {
    code: 'STREAK_60',
    name: 'Série de 60 jours',
    description: 'Atteignez une série de 60 jours consécutifs.',
    category: BadgeCategory.STREAK,
    icon: 'flame',
    isUnlocked: (state) => state.currentStreak >= STREAK_THRESHOLD_60,
  },
  {
    code: 'STREAK_100',
    name: 'Série de 100 jours',
    description: 'Atteignez une série de 100 jours consécutifs.',
    category: BadgeCategory.STREAK,
    icon: 'flame',
    isUnlocked: (state) => state.currentStreak >= STREAK_THRESHOLD_100,
  },
  {
    code: 'PERFORMANCE_SCORE_70',
    name: 'Premier cap à 70',
    description: "Obtenez un score global d'au moins 70.",
    category: BadgeCategory.PERFORMANCE,
    icon: 'target',
    isUnlocked: (state) =>
      state.bestGlobalScore !== null && state.bestGlobalScore >= GLOBAL_SCORE_THRESHOLD_70,
  },
  {
    code: 'PERFORMANCE_SCORE_80',
    name: 'Premier cap à 80',
    description: "Obtenez un score global d'au moins 80.",
    category: BadgeCategory.PERFORMANCE,
    icon: 'award',
    isUnlocked: (state) =>
      state.bestGlobalScore !== null && state.bestGlobalScore >= GLOBAL_SCORE_THRESHOLD_80,
  },
  {
    code: 'PERFORMANCE_AXIS_PERFECT',
    name: 'Score parfait',
    description: 'Obtenez un score de 100 sur un axe.',
    category: BadgeCategory.PERFORMANCE,
    icon: 'star',
    isUnlocked: (state) =>
      state.bestAxisScore !== null && state.bestAxisScore >= PERFECT_AXIS_SCORE,
  },
  {
    code: 'VOLUME_FIRST_SIMULATION',
    name: 'Première simulation',
    description: 'Terminez votre première simulation complète.',
    category: BadgeCategory.VOLUME,
    icon: 'rocket',
    isUnlocked: (state) => state.hasCompletedFullSession,
  },
  {
    code: 'VOLUME_10_SESSIONS',
    name: 'Dix sessions',
    description: 'Terminez 10 sessions.',
    category: BadgeCategory.VOLUME,
    icon: 'dumbbell',
    isUnlocked: (state) => state.completedSessions >= VOLUME_THRESHOLD_10,
  },
  {
    code: 'VOLUME_50_SESSIONS',
    name: 'Cinquante sessions',
    description: 'Terminez 50 sessions.',
    category: BadgeCategory.VOLUME,
    icon: 'trophy',
    isUnlocked: (state) => state.completedSessions >= VOLUME_THRESHOLD_50,
  },
  {
    code: 'MASTERY_ALL_AXES',
    name: 'Tour complet',
    description: 'Complétez chacun des cinq axes au moins une fois.',
    category: BadgeCategory.MASTERY,
    icon: 'layers',
    isUnlocked: (state) => state.completedAxesCount >= REQUIRED_AXES_COUNT,
  },
  {
    code: 'MASTERY_VISUAL_FLAWLESS',
    name: 'Sans-faute visuel',
    description: 'Atteignez 100 % de précision en discrimination visuelle.',
    category: BadgeCategory.MASTERY,
    icon: 'eye',
    isUnlocked: (state) => state.flawlessVisualDiscrimination,
  },
];
