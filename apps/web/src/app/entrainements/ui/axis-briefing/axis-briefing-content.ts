import {
  AxisType,
  LogicFamilyFilter,
  RailwayPlayableAxis,
} from '@psychotech/shared';
import {
  Activity,
  ArrowLeftRight,
  Brain,
  CircleCheck,
  Crosshair,
  Gauge,
  Keyboard,
  LucideIconData,
  MousePointerClick,
  Pointer,
  Puzzle,
  Repeat,
  RotateCw,
  ShieldCheck,
  Smartphone,
  Spline,
  Target,
  Timer,
  Zap,
} from 'lucide-angular';

export type BriefingArrow = 'up' | 'down' | 'left' | 'right';

export interface BriefingCommandPart {
  key?: string;
  arrow?: BriefingArrow;
  button?: string;
  text?: string;
}

export interface BriefingCommandRow {
  icon: LucideIconData;
  parts: BriefingCommandPart[];
}

export interface BriefingSignalMapping {
  colorVar: string;
  shape: 'round' | 'square';
  label: string;
  key?: string;
  arrow?: BriefingArrow;
  mobileButton: string;
}

export interface BriefingSummaryEntry {
  value: string;
  label: string;
}

export interface BriefingEvaluatedChip {
  icon: LucideIconData;
  label: string;
}

export interface AxisBriefingContent {
  tagline: string;
  steps: string[];
  desktopRows: BriefingCommandRow[];
  mobileRows: BriefingCommandRow[];
  mapping?: BriefingSignalMapping[];
  evaluated: BriefingEvaluatedChip[];
  summary: BriefingSummaryEntry[];
  discoverySummary: BriefingSummaryEntry[];
}

export type LogicBriefingFilterKey = 'ALL' | LogicFamilyFilter;

const LOGIC_ROW_CHOICES: BriefingCommandRow = {
  icon: Keyboard,
  parts: [
    { key: 'A-D' },
    { text: 'ou' },
    { key: '1-4' },
    { text: 'pour les choix de réponse' },
  ],
};

const LOGIC_ROW_DOMINO: BriefingCommandRow = {
  icon: Keyboard,
  parts: [{ key: '0-6' }, { text: 'pour chaque face de domino' }],
};

const LOGIC_ROW_TRIANGLE: BriefingCommandRow = {
  icon: Keyboard,
  parts: [{ key: '0-9' }, { text: 'pour les triangles chiffrés' }],
};

const LOGIC_ROW_ERASE_VALIDATE: BriefingCommandRow = {
  icon: Keyboard,
  parts: [
    { key: 'RETOUR' },
    { text: 'efface,' },
    { key: 'ENTRÉE' },
    { text: 'valide l’item' },
  ],
};

const LOGIC_ROW_VALIDATE: BriefingCommandRow = {
  icon: Keyboard,
  parts: [{ key: 'ENTRÉE' }, { text: 'valide l’item' }],
};

export const LOGIC_STEP_INTROS: Record<LogicBriefingFilterKey, string> = {
  ALL: 'Suites numériques, dominos et matrices s’enchaînent par blocs',
  [LogicFamilyFilter.NUMERIC]:
    'Suites numériques et triangles chiffrés : trouvez la règle, complétez la valeur manquante',
  [LogicFamilyFilter.DOMINO]:
    'Suites de dominos : trouvez la règle, complétez les deux faces manquantes',
  [LogicFamilyFilter.MATRIX]:
    'Matrices : repérez la logique de la grille, choisissez la bonne proposition',
};

export const LOGIC_STEP_TIMED_SUFFIX = ', sous un chrono global.';
export const LOGIC_STEP_UNTIMED_SUFFIX = ', sans limite de temps.';

export const LOGIC_DESKTOP_ROWS: Record<
  LogicBriefingFilterKey,
  BriefingCommandRow[]
> = {
  ALL: [
    {
      icon: MousePointerClick,
      parts: [{ text: 'Clic sur les propositions et les pavés de saisie' }],
    },
    LOGIC_ROW_CHOICES,
    LOGIC_ROW_DOMINO,
    LOGIC_ROW_TRIANGLE,
    LOGIC_ROW_ERASE_VALIDATE,
  ],
  [LogicFamilyFilter.NUMERIC]: [
    {
      icon: MousePointerClick,
      parts: [{ text: 'Clic sur les propositions et les pavés de saisie' }],
    },
    LOGIC_ROW_CHOICES,
    LOGIC_ROW_TRIANGLE,
    LOGIC_ROW_ERASE_VALIDATE,
  ],
  [LogicFamilyFilter.DOMINO]: [
    {
      icon: MousePointerClick,
      parts: [{ text: 'Clic sur le pavé de saisie des faces' }],
    },
    LOGIC_ROW_DOMINO,
    LOGIC_ROW_ERASE_VALIDATE,
  ],
  [LogicFamilyFilter.MATRIX]: [
    {
      icon: MousePointerClick,
      parts: [{ text: 'Clic sur les propositions' }],
    },
    LOGIC_ROW_CHOICES,
    LOGIC_ROW_VALIDATE,
  ],
};

export const LOGIC_MOBILE_ROWS: Record<
  LogicBriefingFilterKey,
  BriefingCommandRow[]
> = {
  ALL: [
    {
      icon: Pointer,
      parts: [{ text: 'Touchez une proposition ou le pavé de saisie' }],
    },
    {
      icon: Pointer,
      parts: [
        { button: '0-6' },
        { text: 'faces de domino,' },
        { button: '0-9' },
        { text: 'triangles chiffrés' },
      ],
    },
  ],
  [LogicFamilyFilter.NUMERIC]: [
    {
      icon: Pointer,
      parts: [{ text: 'Touchez une proposition ou le pavé de saisie' }],
    },
    {
      icon: Pointer,
      parts: [{ button: '0-9' }, { text: 'pour les triangles chiffrés' }],
    },
  ],
  [LogicFamilyFilter.DOMINO]: [
    {
      icon: Pointer,
      parts: [{ button: '0-6' }, { text: 'pour chaque face de domino' }],
    },
  ],
  [LogicFamilyFilter.MATRIX]: [
    {
      icon: Pointer,
      parts: [{ text: 'Touchez une proposition pour répondre' }],
    },
  ],
};

export const LOGIC_SUMMARY_FAMILY_ENTRIES: Record<
  LogicBriefingFilterKey,
  BriefingSummaryEntry
> = {
  ALL: { value: '4', label: 'familles d’items' },
  [LogicFamilyFilter.NUMERIC]: { value: '', label: 'numérique uniquement' },
  [LogicFamilyFilter.DOMINO]: { value: '', label: 'dominos uniquement' },
  [LogicFamilyFilter.MATRIX]: { value: '', label: 'matrices uniquement' },
};

export const LOGIC_SUMMARY_UNTIMED_ENTRY: BriefingSummaryEntry = {
  value: '',
  label: 'temps libre',
};

export const AXIS_BRIEFING_CONTENT: Record<
  RailwayPlayableAxis,
  AxisBriefingContent
> = {
  [AxisType.LOGIC]: {
    tagline: 'Trouver la règle et l’appliquer, vite et juste.',
    steps: [
      `${LOGIC_STEP_INTROS.ALL}${LOGIC_STEP_TIMED_SUFFIX}`,
      'Répondez, passez, revenez librement entre les items.',
      'À la fin, tout item sans réponse compte faux.',
    ],
    desktopRows: LOGIC_DESKTOP_ROWS.ALL,
    mobileRows: LOGIC_MOBILE_ROWS.ALL,
    evaluated: [
      { icon: Puzzle, label: 'Déduction de règles' },
      { icon: Timer, label: 'Gestion du temps' },
      { icon: Activity, label: 'Régularité par famille' },
    ],
    summary: [
      { value: '40', label: 'items' },
      { value: '10:00', label: 'temps global' },
      { value: '4', label: 'familles d’items' },
    ],
    discoverySummary: [
      { value: '5', label: 'items' },
      { value: '2:30', label: 'temps global' },
      { value: '4', label: 'familles d’items' },
    ],
  },
  [AxisType.MEMORY]: {
    tagline: 'Retenir une séquence, la restituer dans l’ordre demandé.',
    steps: [
      'Une séquence de chiffres s’affiche élément par élément, puis disparaît.',
      'Restituez-la de mémoire, dans l’ordre demandé.',
      'Certaines séquences se restituent à l’envers.',
    ],
    desktopRows: [
      {
        icon: MousePointerClick,
        parts: [
          {
            text: 'Clic sur le pavé chiffré à l’écran, avec Passer, Effacer et Valider',
          },
        ],
      },
      {
        icon: Keyboard,
        parts: [{ key: '0-9' }, { text: 'saisit les chiffres' }],
      },
      {
        icon: Keyboard,
        parts: [{ key: 'ESPACE' }, { text: 'passe un emplacement oublié' }],
      },
      {
        icon: Keyboard,
        parts: [
          { key: 'RETOUR' },
          { text: 'efface,' },
          { key: 'ENTRÉE' },
          { text: 'valide' },
        ],
      },
    ],
    mobileRows: [
      {
        icon: Pointer,
        parts: [{ button: '0-9' }, { text: 'pavé chiffré à l’écran' }],
      },
      {
        icon: Pointer,
        parts: [{ button: 'Passer' }, { text: 'pour un emplacement oublié' }],
      },
      {
        icon: Pointer,
        parts: [
          { button: '⌫' },
          { text: 'efface,' },
          { button: 'Valider' },
          { text: 'enregistre' },
        ],
      },
    ],
    evaluated: [
      { icon: Brain, label: 'Rétention' },
      { icon: ArrowLeftRight, label: 'Manipulation (ordre inversé)' },
      { icon: Crosshair, label: 'Précision de position' },
    ],
    summary: [
      { value: '5', label: 'séquences' },
      { value: '0:30', label: 'par restitution' },
      { value: '2', label: 'sens de restitution' },
    ],
    discoverySummary: [
      { value: '2', label: 'séquences' },
      { value: '0:30', label: 'par restitution' },
      { value: '1', label: 'sens (ordre normal)' },
    ],
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    tagline: 'Repérer la moindre différence, sans fausse alerte.',
    steps: [
      'Deux suites de caractères s’affichent côte à côte.',
      'Identiques ou différentes ? Enchaînement immédiat.',
      'Enchaînez les essais jusqu’au bout du chrono.',
    ],
    desktopRows: [
      {
        icon: MousePointerClick,
        parts: [{ text: 'Clic sur les boutons Identique / Différent' }],
      },
      {
        icon: Keyboard,
        parts: [{ arrow: 'left' }, { text: 'répond Identique' }],
      },
      {
        icon: Keyboard,
        parts: [{ arrow: 'right' }, { text: 'répond Différent' }],
      },
    ],
    mobileRows: [
      {
        icon: Pointer,
        parts: [
          { button: 'IDENTIQUE' },
          { button: 'DIFFÉRENT' },
          { text: 'sous vos pouces, en bas d’écran' },
        ],
      },
    ],
    evaluated: [
      { icon: Target, label: 'Précision' },
      { icon: Gauge, label: 'Vitesse de décision' },
      { icon: ShieldCheck, label: 'Fiabilité (fausses alertes)' },
    ],
    summary: [
      { value: '36', label: 'essais' },
      { value: '3:00', label: 'temps global' },
      { value: '2', label: 'suites par essai' },
    ],
    discoverySummary: [
      { value: '6', label: 'essais' },
      { value: '1:00', label: 'temps global' },
      { value: '2', label: 'suites par essai' },
    ],
  },
  [AxisType.REACTIVITY]: {
    tagline: 'Réagir vite, avec la bonne commande, sans faiblir.',
    steps: [
      'Des signaux apparaissent à un rythme imprévisible.',
      'Chaque signal a sa commande : déclenchez la bonne, vite.',
      'De nouveaux signaux s’ajoutent en cours d’épreuve, toujours annoncés.',
    ],
    desktopRows: [],
    mobileRows: [],
    mapping: [
      {
        colorVar: 'var(--stimulus-yellow)',
        shape: 'round',
        label: 'Rond jaune',
        arrow: 'left',
        mobileButton: 'Bouton gauche',
      },
      {
        colorVar: 'var(--stimulus-blue)',
        shape: 'round',
        label: 'Rond bleu',
        arrow: 'right',
        mobileButton: 'Bouton droit',
      },
      {
        colorVar: 'var(--stimulus-red)',
        shape: 'square',
        label: 'Carré rouge',
        key: 'ESPACE',
        mobileButton: 'Pédale',
      },
    ],
    evaluated: [
      { icon: Zap, label: 'Vitesse de réaction' },
      { icon: Activity, label: 'Régularité' },
      { icon: CircleCheck, label: 'Justesse des commandes' },
    ],
    summary: [
      { value: '≈45', label: 'stimulus' },
      { value: '3:00', label: 'temps global' },
      { value: '3', label: 'signaux en fin d’épreuve' },
    ],
    discoverySummary: [
      { value: '≈10', label: 'stimulus' },
      { value: '1:00', label: 'temps global' },
      { value: '1', label: 'signal' },
    ],
  },
  [AxisType.MOTOR_SKILLS]: {
    tagline: 'Deux mains, un point, une trajectoire à tenir.',
    steps: [
      'Guidez le point dans le couloir, du départ à l’arrivée.',
      'Une manivelle par direction : celle de gauche = horizontal, celle de droite = vertical.',
      'Toucher les bords coûte des erreurs ; en sortir coûte davantage.',
    ],
    desktopRows: [
      {
        icon: Smartphone,
        parts: [
          { text: 'Votre téléphone sert de manette, appairage ci-dessous' },
        ],
      },
    ],
    mobileRows: [
      {
        icon: RotateCw,
        parts: [{ text: 'Manivelle gauche : déplacement horizontal' }],
      },
      {
        icon: RotateCw,
        parts: [{ text: 'Manivelle droite : déplacement vertical' }],
      },
    ],
    evaluated: [
      { icon: Spline, label: 'Précision de trajectoire' },
      { icon: Timer, label: 'Vitesse' },
      { icon: Repeat, label: 'Constance sur les 3 parcours' },
    ],
    summary: [
      { value: '3', label: 'parcours' },
      { value: '1:30', label: 'max par parcours' },
      { value: '2', label: 'manivelles' },
    ],
    discoverySummary: [
      { value: '1', label: 'parcours' },
      { value: '1:30', label: 'max' },
      { value: '2', label: 'manivelles' },
    ],
  },
};
