import { AxisType } from '../enums';

export enum TrainingOptionId {
  LOGIC_HELP = 'LOGIC_HELP',
  REACTIVITY_LIVE_METRICS = 'REACTIVITY_LIVE_METRICS',
  MOTOR_LIVE_ERROR_COUNTERS = 'MOTOR_LIVE_ERROR_COUNTERS',
}

export interface TrainingOption {
  id: TrainingOptionId;
  label: string;
  description: string;
}

export const AXIS_TRAINING_OPTIONS: Partial<
  Record<AxisType, TrainingOption>
> = {
  [AxisType.LOGIC]: {
    id: TrainingOptionId.LOGIC_HELP,
    label: 'Aide pendant la session',
    description:
      'Affichez la règle de la suite pendant un exercice - la règle, pas la réponse.',
  },
  [AxisType.REACTIVITY]: {
    id: TrainingOptionId.REACTIVITY_LIVE_METRICS,
    label: 'Métriques en direct',
    description:
      "Affichez vos temps de réaction et vos erreurs pendant l'épreuve.",
  },
  [AxisType.MOTOR_SKILLS]: {
    id: TrainingOptionId.MOTOR_LIVE_ERROR_COUNTERS,
    label: "Compteurs d'erreurs en direct",
    description:
      "Affichez les compteurs d'erreurs mineures et majeures pendant les parcours.",
  },
};

export function trainingOptionForAxis(axis: AxisType): TrainingOption | null {
  return AXIS_TRAINING_OPTIONS[axis] ?? null;
}
