import {
  AxisType,
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

export const AXIS_BRIEFING_CONTENT: Record<
  RailwayPlayableAxis,
  AxisBriefingContent
> = {
  [AxisType.LOGIC]: {
    tagline: 'Trouver la règle et l’appliquer, vite et juste.',
    steps: [
      '40 items en 4 blocs : numérique, dominos et matrices, sous un chrono global.',
      'Répondez, passez, revenez librement entre les items.',
      'À la fin, tout item sans réponse compte faux.',
    ],
    desktopRows: [
      {
        icon: MousePointerClick,
        parts: [{ text: 'Clic sur les propositions et les pavés de saisie' }],
      },
      {
        icon: Keyboard,
        parts: [
          { key: 'A-D' },
          { text: 'ou' },
          { key: '1-4' },
          { text: 'pour les choix de réponse' },
        ],
      },
      {
        icon: Keyboard,
        parts: [{ key: '0-6' }, { text: 'pour chaque face de domino' }],
      },
      {
        icon: Keyboard,
        parts: [{ key: '0-9' }, { text: 'pour les triangles chiffrés' }],
      },
    ],
    mobileRows: [
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
    evaluated: [
      { icon: Target, label: 'Précision' },
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
      { value: '1', label: 'famille (numérique)' },
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
        icon: Keyboard,
        parts: [{ arrow: 'left' }, { text: 'répond Identique' }],
      },
      {
        icon: Keyboard,
        parts: [{ arrow: 'right' }, { text: 'répond Différent' }],
      },
      {
        icon: MousePointerClick,
        parts: [{ text: 'Ou clic sur les boutons Identique / Différent' }],
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
      'Une manivelle par direction : gauche = horizontal, droite = vertical.',
      'Toucher les bords coûte des erreurs ; en sortir coûte davantage.',
    ],
    desktopRows: [
      {
        icon: Smartphone,
        parts: [
          {
            text: 'Manette téléphone recommandée : une manivelle par direction',
          },
        ],
      },
      {
        icon: Keyboard,
        parts: [
          { arrow: 'up' },
          { arrow: 'down' },
          { arrow: 'left' },
          { arrow: 'right' },
          { text: 'en secours, pour déplacer le point' },
        ],
      },
    ],
    mobileRows: [
      {
        icon: RotateCw,
        parts: [
          { button: 'Manivelle gauche' },
          { text: 'déplace horizontalement' },
        ],
      },
      {
        icon: RotateCw,
        parts: [
          { button: 'Manivelle droite' },
          { text: 'déplace verticalement' },
        ],
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
