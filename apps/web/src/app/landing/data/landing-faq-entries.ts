export interface LandingFaqEntry {
  question: string;
  answer: string;
}

export const LANDING_FAQ_ENTRIES: LandingFaqEntry[] = [
  {
    question: "À qui s'adresse PsychoTech ?",
    answer:
      'Aux candidats qui préparent une sélection professionnelle comportant des tests psychotechniques. Les épreuves, barèmes et seuils sont calibrés secteur par secteur.',
  },
  {
    question: 'Les exercices se répètent-ils ?',
    answer:
      "Non : chaque session est inédite. Impossible d'apprendre les réponses par cœur, vous entraînez la compétence réelle et votre score reflète votre vrai niveau.",
  },
  {
    question: 'Quels secteurs sont couverts ?',
    answer:
      "Le secteur ferroviaire est disponible aujourd'hui. D'autres secteurs (médical, aviation, sécurité, industrie) sont en préparation et s'ajouteront avec leurs propres barèmes.",
  },
  {
    question: 'Comment commencer ?',
    answer:
      "Créez un compte gratuitement : le mode découverte de chaque axe est en accès libre, sans carte bancaire, et 3 crédits vous sont offerts à l'inscription. Ensuite, vous achetez des crédits par packs, selon vos besoins : aucun abonnement, aucune reconduction.",
  },
];
