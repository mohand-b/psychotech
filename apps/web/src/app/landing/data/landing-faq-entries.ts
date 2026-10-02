import { SIGNUP_ENERGY_GRANT } from '@psychotech/shared';

export interface LandingFaqEntry {
  question: string;
  answer: string;
}

export const LANDING_FAQ_ENTRIES: LandingFaqEntry[] = [
  {
    question: "À qui s'adresse PsychoTech ?",
    answer:
      'Aux candidats qui préparent une sélection professionnelle comportant des tests psychotechniques. Le secteur ferroviaire est disponible, avec ses épreuves, barèmes et seuils propres.',
  },
  {
    question: 'Les exercices se répètent-ils ?',
    answer:
      "Non : chaque exercice est généré au moment où vous le lancez. Impossible d'apprendre les réponses par cœur, vous entraînez la compétence réelle et votre score reflète votre vrai niveau.",
  },
  {
    question: 'Quels secteurs sont couverts ?',
    answer:
      "Le ferroviaire est disponible aujourd'hui. Aviation, sécurité, conduite et santé sont en préparation et s'ajouteront avec leurs propres épreuves, axes et barèmes.",
  },
  {
    question: 'Comment commencer ?',
    answer: `Créez un compte gratuitement : le mode découverte de chaque axe est en accès libre et ${SIGNUP_ENERGY_GRANT} crédits vous sont offerts. Ensuite, vous achetez des crédits par packs, sans abonnement ni reconduction.`,
  },
];
