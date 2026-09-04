import { AxisType, LogicFamilyFilter, SessionMode } from '@psychotech/shared';

export const DEMO_SEED = 'psychotech-demo-2026';

export const DEMO_EMAIL = 'john.doe@example.com';
export const DEMO_PASSWORD = 'Ferroviaire2026!';
export const DEMO_FIRST_NAME = 'John';
export const DEMO_LAST_NAME = 'Doe';

// Solde affiché à l'écran une fois le peuplement terminé.
export const DEMO_CREDITS = 50;

// Solde de travail pendant le peuplement : le débit réel a lieu à chaque
// lancement, il ne doit jamais bloquer la génération.
export const DEMO_WORKING_CREDITS = 500;

export const CRITICAL_AXES: readonly AxisType[] = [
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
];

// Plancher des axes critiques : sous le seuil éliminatoire de 55, un seul
// d'entre eux suffirait à rendre chaque examen blanc défavorable.
export const CRITICAL_AXIS_ABILITY_FLOOR = 0.52;

// Les matrices de déduction concentrent les erreurs de Logique, pour que la
// section « Par famille » et les constats aient de quoi parler.
export const MATRIX_ABILITY_FACTOR = 0.55;

// Plafonds mesurés avec calibrate.ts (moyenne sur 6 seeds) :
//   habileté      0.30  0.50  0.70  0.90  0.95
//   LOGIC           43    45    53    67    69   → ne franchit jamais 70
//   MEMORY          58    79    84    89    96
//   DISCRIMINATION  66    63    71    78    80
//   REACTIVITY      69    82    87    93    95
//   MOTOR            6    90   100   100   100  → falaise entre 0.40 et 0.50
//
// AXE LAISSÉ EN DIFFICULTÉ : la LOGIQUE. C'est l'axe naturellement le plus dur
// du barème — il progresse nettement (43 → 67) mais reste sous le seuil de 70,
// ce qui alimente « Votre point faible » et les recommandations. Il n'est pas
// critique en Ferroviaire (coefficient 1.0), donc le dernier examen blanc
// reste favorable malgré lui.
// Plafond de Logique : même à 0.60 la dispersion monte à ~57, et un seul tir
// au-dessus de 70 suffirait à décrocher le bronze et à débloquer « Sur les
// rails » (qui exige les cinq axes ≥ 70). L'axe doit rester sous le seuil.
const LOGIC_ABILITY_CAP = 0.6;
const MEMORY_ABILITY_CAP = 0.88;
const DISCRIMINATION_ABILITY_CAP = 0.8;
const REACTIVITY_ABILITY_CAP = 0.72;

// La Motricité est ramenée dans sa zone utile : en dessous de 0.40 elle
// s'effondre à 0, au-dessus de 0.50 elle sature à 100. Aucun axe ne doit
// paraître parfait.
const MOTRICITY_ABILITY_BASE = 0.36;
const MOTRICITY_ABILITY_SPAN = 0.16;
const MOTRICITY_ABILITY_CEILING = 0.5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export interface PlannedSession {
  dayOffset: number;
  mode: SessionMode;
  axis?: AxisType;
  ability: number;
  logicFamily?: LogicFamilyFilter;
  // Nombre d'axes réellement joués avant d'abandonner. Absent = session menée
  // à son terme. La session reste inachevée : c'est le lancement suivant qui
  // la bascule en ABANDONNÉE, exactement comme dans l'application.
  abandonAfterAxes?: number;
  // Session jouée sans la moindre faute sur son axe : le simulateur annule
  // ses taux d'erreur. C'est ce qui fait tomber le badge OR de l'axe, dont la
  // condition est une preuve de perfection, jamais un score.
  flawless?: boolean;
  // Abaisse le plancher des axes critiques pour cette session seulement :
  // c'est ce qui rend une contre-performance réellement visible sur la courbe,
  // que le plancher habituel écraserait.
  criticalFloor?: number;
  // Force l'habileté d'axes précis, en court-circuitant abilityForAxis et ses
  // plafonds/planchers : sert à sculpter un cas particulier (un examen blanc
  // globalement admissible mais recalé par un axe critique effondré).
  axisAbilities?: Partial<Record<AxisType, number>>;
}

// Six semaines, rythme irrégulier : des semaines chargées, une semaine creuse
// (semaine 4), deux abandons. Les habiletés dessinent début faible →
// progression → contre-performance assumée en semaine 5 → remontée finale.
export const DEMO_PLAN: readonly PlannedSession[] = [
  { dayOffset: -40, mode: SessionMode.FULL, ability: 0.3 },
  { dayOffset: -38, mode: SessionMode.TARGETED, axis: AxisType.LOGIC, ability: 0.32 },
  { dayOffset: -36, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.55 },

  { dayOffset: -33, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.55 },
  { dayOffset: -31, mode: SessionMode.TARGETED, axis: AxisType.VISUAL_DISCRIMINATION, ability: 0.58 },
  { dayOffset: -30, mode: SessionMode.FULL, ability: 0.6, abandonAfterAxes: 2 },

  { dayOffset: -26, mode: SessionMode.FULL, ability: 0.62 },
  { dayOffset: -24, mode: SessionMode.TARGETED, axis: AxisType.LOGIC, ability: 0.62 },
  { dayOffset: -22, mode: SessionMode.TARGETED, axis: AxisType.MOTOR_SKILLS, ability: 0.5 },

  // Semaine 4 volontairement vide.

  // Contre-performance assumée : la reprise après la semaine creuse est ratée.
  { dayOffset: -14, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.4, criticalFloor: 0.4 },
  { dayOffset: -12, mode: SessionMode.FULL, ability: 0.42, criticalFloor: 0.44 },
  { dayOffset: -10, mode: SessionMode.TARGETED, axis: AxisType.VISUAL_DISCRIMINATION, ability: 0.85 },
  // Le pic de la préparation : une Réactivité sans faute, qui décroche
  // « Éclair » (badge OR). Les autres axes restent imparfaits.
  { dayOffset: -9, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.9, flawless: true },

  { dayOffset: -5, mode: SessionMode.TARGETED, axis: AxisType.LOGIC, ability: 0.9 },
  { dayOffset: -4, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.8, abandonAfterAxes: 0 },
  { dayOffset: -3, mode: SessionMode.TARGETED, axis: AxisType.MOTOR_SKILLS, ability: 0.9 },
  { dayOffset: -1, mode: SessionMode.FULL, ability: 0.9 },
];

// Ajoutée après coup et hors de la courbe : elle porte le tag « Familles »
// dans l'historique et est exclue du meilleur score par le pipeline lui-même.
export const DEMO_FILTERED_PLAN: readonly PlannedSession[] = [
  {
    dayOffset: -2,
    mode: SessionMode.TARGETED,
    axis: AxisType.LOGIC,
    ability: 0.82,
    logicFamily: LogicFamilyFilter.MATRIX,
  },
];

export function abilityForAxis(
  axis: AxisType,
  general: number,
  criticalFloor: number = CRITICAL_AXIS_ABILITY_FLOOR,
): number {
  if (axis === AxisType.LOGIC) {
    return Math.min(general, LOGIC_ABILITY_CAP);
  }
  if (axis === AxisType.MEMORY) {
    return clamp(general, criticalFloor, MEMORY_ABILITY_CAP);
  }
  if (axis === AxisType.VISUAL_DISCRIMINATION) {
    return clamp(general * 0.95, criticalFloor, DISCRIMINATION_ABILITY_CAP);
  }
  if (axis === AxisType.REACTIVITY) {
    return clamp(general, criticalFloor, REACTIVITY_ABILITY_CAP);
  }
  return clamp(
    MOTRICITY_ABILITY_BASE + general * MOTRICITY_ABILITY_SPAN,
    MOTRICITY_ABILITY_BASE,
    MOTRICITY_ABILITY_CEILING,
  );
}
