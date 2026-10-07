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

export function buildReleaseAnchor(version: string): string {
  return `v${version.split('.').join('-')}`;
}

export const RELEASE_LOG: readonly Release[] = [
  {
    version: '1.2.2',
    releasedOn: '2026-10-07',
    title: 'Page Progression repensée',
    entries: {
      [ReleaseCategory.IMPROVEMENT]: [
        'Page Progression repensée, sur ordinateur comme sur mobile : évolution de chaque épreuve depuis la première session et résumé des badges.',
      ],
    },
  },
  {
    version: '1.2.1',
    releasedOn: '2026-10-03',
    title: 'Tarifs, crédits et badges',
    entries: {
      [ReleaseCategory.IMPROVEMENT]: [
        'Pages Tarifs, Crédits et Badges repensées, sur ordinateur comme sur mobile.',
      ],
      [ReleaseCategory.FIX]: [
        'Badge Or de l’épreuve Mémoire désormais accessible : toutes les séquences de la session restituées sans erreur.',
      ],
    },
  },
  {
    version: '1.2.0',
    releasedOn: '2026-10-02',
    title: 'Nouvelle page d’accueil',
    entries: {
      [ReleaseCategory.NEW]: [
        'Nouvelle page d’accueil du site, sur ordinateur comme sur mobile : déroulé d’une préparation étape par étape et aperçu de l’exercice de chacune des cinq épreuves.',
      ],
      [ReleaseCategory.IMPROVEMENT]: [
        'Accueil de l’espace candidat : score de chaque épreuve affiché sous le dernier résultat, sur ordinateur comme sur mobile.',
      ],
    },
  },
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
      [ReleaseCategory.FIX]: [
        'Fin d’épreuve : correction d’un blocage qui pouvait obliger à reprendre le module depuis le début.',
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
        'Entraînements ciblés par épreuve et examens blancs complets, avec des exercices renouvelés à chaque session.',
        'Bilan détaillé après chaque session : score, avis favorable ou défavorable, radar des épreuves, synthèse et recommandations personnalisées.',
        'Correction consultable après chaque épreuve, et page Progression avec le meilleur score et les courbes d’évolution.',
        '21 badges à décrocher : trois paliers par épreuve, des badges d’examen blanc et des badges de parcours, avec leur rareté et une célébration à l’obtention.',
        'Fil des obtentions sur l’accueil : le prénom n’y apparaît qu’après activation depuis le profil.',
        'Compte : vérification de l’adresse email, connexion avec Google et mot de passe oublié.',
      ],
      [ReleaseCategory.CONTENT]: [
        'Guide des épreuves et guide de Logique : chaque exercice expliqué avant de se lancer.',
        'Page « Exemple de bilan » consultable sans compte.',
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
