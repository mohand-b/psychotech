export interface LandingScreenAsset {
  src: string;
  compactSrc?: string;
  alt: string;
  companion?: LandingScreenAsset;
}

const SCREENS_DIRECTORY = '/landing/screens';
const PHONE_SCREENS_DIRECTORY = `${SCREENS_DIRECTORY}/mobile`;
const CLOSE_UP_SCREENS_DIRECTORY = `${SCREENS_DIRECTORY}/mobile-close-up`;

function buildScreenAsset(
  file: string,
  alt: string,
  compactDirectory?: string,
): LandingScreenAsset {
  const asset = { src: `${SCREENS_DIRECTORY}/${file}.webp`, alt };
  return compactDirectory
    ? { ...asset, compactSrc: `${compactDirectory}/${file}.webp` }
    : asset;
}

const MOTRICITY_ALT =
  'Épreuve de Motricité en cours : curseur à guider dans un couloir en diagonale';

const GAMEPAD = buildScreenAsset(
  'manette-paysage',
  'Téléphone en paysage connecté comme manette : deux manivelles pour piloter le curseur',
);

export const LANDING_SCREENS = {
  dashboard: buildScreenAsset(
    'accueil',
    'Tableau de bord PsychoTech : séance du jour, crédits, dernier résultat et profil par axe',
  ),
  dominosMobile: buildScreenAsset(
    'dominos-mobile',
    'Entraînement ciblé de Logique sur mobile : suite de dominos à compléter',
  ),
  targetedTraining: buildScreenAsset(
    'entrainements-cible',
    "Choix d'un entraînement ciblé parmi les axes du secteur ferroviaire",
    PHONE_SCREENS_DIRECTORY,
  ),
  motricity: {
    ...buildScreenAsset('motricite', MOTRICITY_ALT, PHONE_SCREENS_DIRECTORY),
    companion: GAMEPAD,
  },
  matrices: buildScreenAsset(
    'matrices-distribution',
    'Matrice de Logique générée au lancement, registre Distribution',
    PHONE_SCREENS_DIRECTORY,
  ),
  simulationReport: buildScreenAsset(
    'bilan-examen-blanc',
    "Bilan d'examen blanc : avis d'admissibilité, score global et détail par axe",
    PHONE_SCREENS_DIRECTORY,
  ),
  reactivityResult: buildScreenAsset(
    'resultat-reactivite',
    "Détail du résultat de l'axe Réactivité",
    PHONE_SCREENS_DIRECTORY,
  ),
  progression: buildScreenAsset(
    'progression',
    'Progression : évolution du score global et de chaque axe face au seuil',
    PHONE_SCREENS_DIRECTORY,
  ),
  triangles: buildScreenAsset(
    'triangles',
    'Exercice de triangles chiffrés en cours',
    CLOSE_UP_SCREENS_DIRECTORY,
  ),
  memory: buildScreenAsset(
    'memoire',
    "Exercice de Mémoire : restitution d'une séquence dans l'ordre demandé",
    CLOSE_UP_SCREENS_DIRECTORY,
  ),
  discrimination: buildScreenAsset(
    'discrimination',
    'Exercice de Discrimination visuelle : deux suites de signes à comparer',
    CLOSE_UP_SCREENS_DIRECTORY,
  ),
  reactivity: buildScreenAsset(
    'reactivite',
    'Exercice de Réactivité : un signal à associer à la bonne commande',
    CLOSE_UP_SCREENS_DIRECTORY,
  ),
  motricityCloseUp: {
    ...buildScreenAsset('motricite', MOTRICITY_ALT, CLOSE_UP_SCREENS_DIRECTORY),
    companion: GAMEPAD,
  },
} satisfies Record<string, LandingScreenAsset>;
