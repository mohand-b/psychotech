export enum ReleaseCategory {
  NEW = 'new',
  IMPROVEMENT = 'improvement',
  FIX = 'fix',
  CONTENT = 'content',
}

export enum UpcomingStatus {
  IN_PROGRESS = 'in-progress',
  UNDER_STUDY = 'under-study',
}

export type ReleaseEntries = Partial<
  Record<ReleaseCategory, readonly string[]>
>;

export interface Release {
  version: string;
  releasedOn: string;
  title: string;
  entries: ReleaseEntries;
}

export interface UpcomingItem {
  status: UpcomingStatus;
  text: string;
  detail: string;
}

export function formatVersionLabel(version: string): string {
  return `v${version}`;
}

export function releaseAnchor(version: string): string {
  return `v${version.split('.').join('-')}`;
}

export const RELEASE_LOG: readonly Release[] = [
  {
    version: '1.1.0',
    releasedOn: '2026-09-20',
    title: 'Formulaire de contact',
    entries: {
      [ReleaseCategory.NEW]: [
        'Page Contact : question, suggestion d’amélioration ou signalement d’un problème, avec ou sans compte, depuis le site comme depuis l’espace candidat.',
        'Pour un utilisateur connecté : adresse email préremplie et session concernée joignable à un signalement.',
        'Accusé de réception envoyé par email ; informations techniques jointes uniquement avec l’accord de l’expéditeur.',
      ],
    },
  },
  {
    version: '1.0.0',
    releasedOn: '2026-09-19',
    title: 'Lancement public',
    entries: {
      [ReleaseCategory.NEW]: [
        'Cinq épreuves du secteur ferroviaire : Logique, Mémoire, Discrimination visuelle, Réactivité et Motricité, cette dernière jouable avec un téléphone en guise de manette.',
        'Logique : choix des familles d’exercices à travailler et entraînement possible sans chronomètre.',
        'Entraînements ciblés par épreuve et examens blancs complets, avec des exercices renouvelés à chaque session et la possibilité de mettre en pause puis de reprendre.',
        'Bilan détaillé après chaque session : score, avis favorable ou défavorable, radar des épreuves, synthèse et recommandations personnalisées.',
        'Correction consultable après chaque épreuve, et page Progression avec le meilleur score et les courbes d’évolution.',
        'Des crédits plutôt qu’un abonnement : trois packs (Découverte à 2,90 €, Avant l’examen à 7,90 €, Préparation complète à 14,90 €), des crédits offerts à l’inscription, sans expiration, et une facture PDF à chaque achat.',
        '21 badges à décrocher : trois paliers par épreuve, des badges d’examen blanc et des badges de parcours, avec leur rareté et une célébration à l’obtention.',
        'Fil des obtentions sur l’accueil : le prénom n’y apparaît qu’après activation depuis le profil.',
        'Compte : vérification de l’adresse email, connexion avec Google, mot de passe oublié et profil complet.',
        'Page « Exemple de bilan » consultable sans compte, et site utilisable depuis les navigateurs intégrés de Snapchat et d’Instagram.',
        'Animations soignées sur le bilan, jamais pendant une épreuve chronométrée.',
      ],
      [ReleaseCategory.CONTENT]: [
        'Guide des épreuves et guide de Logique : chaque exercice expliqué avant de se lancer.',
      ],
    },
  },
];

export const UPCOMING_ITEMS: readonly UpcomingItem[] = [
  {
    status: UpcomingStatus.UNDER_STUDY,
    text: 'Espace entreprise : un centre de formation ou un employeur invite ses candidats et suit leur progression.',
    detail: 'Uniquement avec l’accord explicite de chaque candidat.',
  },
  {
    status: UpcomingStatus.UNDER_STUDY,
    text: 'Application Android sur le Play Store.',
    detail: 'Pour installer PsychoTech comme une application.',
  },
];
