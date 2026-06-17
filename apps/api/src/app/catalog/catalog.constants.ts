import { AxisType } from '@psychotech/shared';

export interface AxisDescriptor {
  label: string;
  description: string;
}

export const AXIS_CATALOG: Record<AxisType, AxisDescriptor> = {
  [AxisType.LOGIC]: {
    label: 'Logique',
    description: 'Raisonnement sur des suites de chiffres, de lettres et de symboles.',
  },
  [AxisType.MEMORY]: {
    label: 'Mémoire',
    description:
      'Mémorisation de séquences de plus en plus longues, en ordre normal et inversé.',
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    label: 'Discrimination visuelle',
    description: 'Repérage rapide des différences entre éléments visuels très proches.',
  },
  [AxisType.REACTIVITY]: {
    label: 'Réactivité',
    description: 'Vitesse et régularité des réponses, avec inhibition des stimuli à ignorer.',
  },
  [AxisType.MOTOR_SKILLS]: {
    label: 'Motricité',
    description: 'Précision et coordination du geste sur des parcours guidés.',
  },
};

export const CATALOG_AXIS_ORDER: AxisType[] = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];
