import { AxisType } from '../enums';

export enum TrainingOptionId {
  LOGIC_HELP = 'LOGIC_HELP',
  NO_TIMER = 'NO_TIMER',
  REACTIVITY_LIVE_METRICS = 'REACTIVITY_LIVE_METRICS',
  MOTOR_LIVE_ERROR_COUNTERS = 'MOTOR_LIVE_ERROR_COUNTERS',
}

export interface TrainingOption {
  id: TrainingOptionId;
  label: string;
  description: string;
}

const NO_TIMER_OPTION: TrainingOption = {
  id: TrainingOptionId.NO_TIMER,
  label: 'Sans chronomètre',
  description:
    'Entraînez-vous sans limite de temps. La sélection réelle reste chronométrée.',
};

export const AXIS_TRAINING_OPTIONS: Partial<
  Record<AxisType, TrainingOption[]>
> = {
  [AxisType.LOGIC]: [
    {
      id: TrainingOptionId.LOGIC_HELP,
      label: 'Aide pendant la session',
      description:
        "Affichez la règle d'un item pendant l'exercice : la règle, pas la réponse.",
    },
    NO_TIMER_OPTION,
  ],
  [AxisType.VISUAL_DISCRIMINATION]: [NO_TIMER_OPTION],
  [AxisType.REACTIVITY]: [
    {
      id: TrainingOptionId.REACTIVITY_LIVE_METRICS,
      label: 'Métriques en direct',
      description:
        "Votre temps de réaction moyen s'affiche pendant la session.",
    },
  ],
  [AxisType.MOTOR_SKILLS]: [
    {
      id: TrainingOptionId.MOTOR_LIVE_ERROR_COUNTERS,
      label: "Compteurs d'erreurs en direct",
      description:
        "Affichez les compteurs d'erreurs mineures et majeures pendant les parcours.",
    },
  ],
};

export function trainingOptionsForAxis(axis: AxisType): TrainingOption[] {
  return AXIS_TRAINING_OPTIONS[axis] ?? [];
}
