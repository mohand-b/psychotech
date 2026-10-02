import { EXAMPLE_BILAN_ROUTE } from '../../shared/util/example-bilan-link';
import { LANDING_SCREENS, LandingScreenAsset } from './landing-screens';

export interface LandingStoryLink {
  label: string;
  route: string;
}

export interface LandingStoryStep {
  title: string;
  body: string;
  caption: string;
  screen: LandingScreenAsset;
  link?: LandingStoryLink;
}

export const LANDING_STORY_STEPS: readonly LandingStoryStep[] = [
  {
    title: 'Choisissez votre séance',
    body: "Un examen blanc complet de l'épreuve de votre secteur, ou un entraînement ciblé sur l'axe que vous voulez renforcer. Chaque axe dispose d'un mode découverte gratuit.",
    caption: 'Entraînements ciblés',
    screen: LANDING_SCREENS.targetedTraining,
  },
  {
    title: "Passez l'épreuve en conditions réelles",
    body: "Chronomètre, consignes et enchaînement identiques à la sélection, jusqu'à la pression du temps. Aucune seconde chance pendant la séance.",
    caption: 'Épreuve de Motricité, en cours',
    screen: LANDING_SCREENS.motricity,
  },
  {
    title: "Des exercices générés à l'infini",
    body: "Chaque exercice est généré au moment où vous le lancez, selon les règles et le niveau de l'épreuve. Aucune session ne ressemble à la précédente : impossible d'apprendre par cœur, vous entraînez la compétence réellement évaluée.",
    caption: 'Logique : matrices, exercice généré',
    screen: LANDING_SCREENS.matrices,
  },
  {
    title: 'Lisez votre bilan',
    body: "Avis d'admissibilité, score par axe, correction de vos réponses et recommandations priorisées pour la prochaine séance.",
    caption: "Bilan d'examen blanc",
    screen: LANDING_SCREENS.simulationReport,
    link: { label: 'Voir un exemple de bilan', route: EXAMPLE_BILAN_ROUTE },
  },
  {
    title: "Un score aussi exigeant que l'épreuve",
    body: "Précision, temps de réponse et régularité ramenés à un score sur 100 par axe, pondéré selon votre secteur. Un axe critique sous son seuil rend l'avis défavorable, quel que soit le score global.",
    caption: "Détail d'un axe",
    screen: LANDING_SCREENS.reactivityResult,
  },
  {
    title: 'Suivez votre progression',
    body: 'Historique de toutes vos séances, évolution du score global et de chaque axe face au seuil, meilleur score et tendance. Vous savez où vous en êtes et quoi travailler.',
    caption: 'Progression',
    screen: LANDING_SCREENS.progression,
  },
];
