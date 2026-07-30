import { AXIS_META, AxisType } from '@psychotech/shared';

interface AxisDescriptor {
  label: string;
  description: string;
}

const AXIS_DESCRIPTIONS: Record<AxisType, string> = {
  [AxisType.LOGIC]: 'Raisonnement sur des suites logiques de nombres.',
  [AxisType.MEMORY]:
    'Mémorisation de séquences de plus en plus longues, en ordre normal et inversé.',
  [AxisType.VISUAL_DISCRIMINATION]:
    'Repérage rapide des différences entre éléments visuels très proches.',
  [AxisType.REACTIVITY]:
    'Vitesse et régularité des réponses, avec inhibition des stimuli à ignorer.',
  [AxisType.MOTOR_SKILLS]:
    'Précision et coordination du geste sur des parcours guidés.',
  [AxisType.ATTENTION]:
    'Maintien et partage de l’attention sur des tâches prolongées.',
  [AxisType.NUMERICAL]: 'Raisonnement et calcul sur des données chiffrées.',
  [AxisType.VERBAL]: 'Compréhension et raisonnement sur le langage.',
  [AxisType.SPATIAL]:
    'Représentation et manipulation mentale des formes dans l’espace.',
};

export const AXIS_CATALOG: Record<AxisType, AxisDescriptor> = Object.fromEntries(
  Object.values(AxisType).map((axis) => [
    axis,
    { label: AXIS_META[axis].label, description: AXIS_DESCRIPTIONS[axis] },
  ]),
) as Record<AxisType, AxisDescriptor>;
