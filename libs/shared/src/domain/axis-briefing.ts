import { AxisType } from '../enums';

export interface AxisBriefing {
  consigne: string;
  objectif: string;
  itemCount: number | null;
  durationSec: number | null;
}

export const AXIS_BRIEFING: Record<AxisType, AxisBriefing> = {
  [AxisType.LOGIC]: {
    consigne:
      'Complétez chaque suite logique en choisissant, parmi quatre propositions, la valeur qui la poursuit.',
    objectif:
      "Répondre juste au plus grand nombre d'items avant la fin du temps. Une réponse passée ne revient pas.",
    itemCount: 40,
    durationSec: 600,
  },
  [AxisType.MEMORY]: {
    consigne:
      'Mémorisez chaque séquence affichée, puis restituez-la — en ordre normal, puis en ordre inversé.',
    objectif:
      'Restituer correctement des séquences de plus en plus longues.',
    itemCount: null,
    durationSec: null,
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    consigne:
      'Comparez les suites présentées et indiquez si elles sont identiques ou différentes.',
    objectif: 'Repérer le plus de différences possible, le plus vite possible.',
    itemCount: null,
    durationSec: null,
  },
  [AxisType.REACTIVITY]: {
    consigne:
      'Réagissez le plus vite possible aux signaux valides, et ignorez les signaux à inhiber.',
    objectif: 'Répondre vite et juste, sans céder aux fausses alertes.',
    itemCount: null,
    durationSec: null,
  },
  [AxisType.MOTOR_SKILLS]: {
    consigne:
      'Suivez chaque parcours guidé avec précision, sans sortir du couloir.',
    objectif: "Maximiser la précision du geste sur l'ensemble des parcours.",
    itemCount: null,
    durationSec: null,
  },
  [AxisType.ATTENTION]: {
    consigne: '',
    objectif: '',
    itemCount: null,
    durationSec: null,
  },
  [AxisType.NUMERICAL]: {
    consigne: '',
    objectif: '',
    itemCount: null,
    durationSec: null,
  },
  [AxisType.VERBAL]: {
    consigne: '',
    objectif: '',
    itemCount: null,
    durationSec: null,
  },
  [AxisType.SPATIAL]: {
    consigne: '',
    objectif: '',
    itemCount: null,
    durationSec: null,
  },
};
