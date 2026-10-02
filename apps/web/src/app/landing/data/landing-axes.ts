import { AxisType, SECTOR_AXES, Sector } from '@psychotech/shared';
import { AXIS_PRESENTATION } from '../../shared/ui/axis-presentation';
import { LANDING_SCREENS, LandingScreenAsset } from './landing-screens';

export const LANDING_SECTOR = Sector.RAILWAY;

interface LandingAxisCopy {
  description: string;
  measure: string;
  training: string;
  screen: LandingScreenAsset;
}

export interface LandingAxis extends LandingAxisCopy {
  axis: AxisType;
  label: string;
  shortLabel: string;
  colorVar: string;
}

const LANDING_AXIS_COPY: Partial<Record<AxisType, LandingAxisCopy>> = {
  [AxisType.LOGIC]: {
    description:
      "Identifier la règle d'une suite et la prolonger, vite et sans erreur.",
    measure:
      "Raisonnement inductif : repérer une règle de progression et l'appliquer sous contrainte de temps.",
    training:
      "Dominos, matrices et triangles chiffrés, trois registres générés à l'infini, avec correction détaillée de chaque item.",
    screen: LANDING_SCREENS.triangles,
  },
  [AxisType.MEMORY]: {
    description:
      "Retenir une séquence et la restituer dans l'ordre demandé, y compris inversé.",
    measure:
      "Mémoire de travail : conserver une séquence puis la restituer, dans l'ordre ou à l'envers.",
    training:
      'La longueur de séquence mémorisée augmente avec vos réussites, pour repousser votre limite séance après séance.',
    screen: LANDING_SCREENS.memory,
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    description:
      'Comparer deux suites et repérer la moindre différence, sans fausse alerte.',
    measure:
      'Attention visuelle sélective : détecter un écart entre deux suites de signes en un temps limité.',
    training:
      "Précision et vitesse à la fois : chaque fausse alerte compte autant qu'un oubli.",
    screen: LANDING_SCREENS.discrimination,
  },
  [AxisType.REACTIVITY]: {
    description: 'Réagir vite, au bon moment, avec la bonne commande.',
    measure:
      'Temps de réaction à choix multiple : associer vite un signal à la bonne commande, sans erreur.',
    training:
      "Régularité des temps de réponse et absence d'anticipation, sur des séries de plus en plus denses.",
    screen: LANDING_SCREENS.reactivity,
  },
  [AxisType.MOTOR_SKILLS]: {
    description:
      'Coordonner les deux mains pour suivre une trajectoire avec précision.',
    measure:
      'Coordination bimanuelle : maintenir un curseur dans un couloir qui défile, avec deux commandes indépendantes.',
    training:
      'Stabilité et anticipation de la trajectoire, sur des parcours variés et jamais identiques.',
    screen: LANDING_SCREENS.motricityCloseUp,
  },
};

export const LANDING_AXES: readonly LandingAxis[] = SECTOR_AXES[
  LANDING_SECTOR
].flatMap((axis) => {
  const copy = LANDING_AXIS_COPY[axis];
  if (!copy) {
    return [];
  }
  const presentation = AXIS_PRESENTATION[axis];
  return [
    {
      axis,
      label: presentation.label,
      shortLabel: presentation.shortLabel,
      colorVar: presentation.plainVar,
      ...copy,
    },
  ];
});
