import { AxisType, LogicFamilyFilter, SessionMode } from '@psychotech/shared';

export const DEMO_SEED = 'psychotech-demo-2026';

export const DEMO_EMAIL = 'camille.rousseau@demo.psychotech.local';
export const DEMO_PASSWORD = 'Ferroviaire2026!';
export const DEMO_FIRST_NAME = 'Camille';
export const DEMO_LAST_NAME = 'Rousseau';

export const CRITICAL_AXES: readonly AxisType[] = [
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
];

// La Motricité plafonne bas sur toute la période : elle n'est pas un axe
// critique en Ferroviaire, donc le dernier examen blanc reste favorable.
export const MOTRICITY_ABILITY_CAP = 0.46;

// Plancher des axes critiques : sous le seuil éliminatoire de 55, un seul
// d'entre eux suffirait à rendre chaque examen blanc défavorable.
export const CRITICAL_AXIS_ABILITY_FLOOR = 0.52;

// Les matrices de déduction concentrent les erreurs de Logique, pour que la
// section « Par famille » et les constats aient de quoi parler.
export const MATRIX_ABILITY_FACTOR = 0.55;

export interface PlannedSession {
  dayOffset: number;
  mode: SessionMode;
  axis?: AxisType;
  ability: number;
  logicFamily?: LogicFamilyFilter;
}

// Dix semaines, dix-huit sessions, des jours creux : un rythme humain, pas une
// session par jour. Les habiletés dessinent début faible → progression →
// creux assumé en semaine 7 → remontée → dernier examen blanc réussi.
export const DEMO_PLAN: readonly PlannedSession[] = [
  { dayOffset: -70, mode: SessionMode.FULL, ability: 0.58 },
  { dayOffset: -68, mode: SessionMode.TARGETED, axis: AxisType.LOGIC, ability: 0.59 },
  { dayOffset: -65, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.6 },
  { dayOffset: -61, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.61 },

  { dayOffset: -56, mode: SessionMode.TARGETED, axis: AxisType.VISUAL_DISCRIMINATION, ability: 0.66 },
  { dayOffset: -52, mode: SessionMode.FULL, ability: 0.69 },
  { dayOffset: -47, mode: SessionMode.TARGETED, axis: AxisType.LOGIC, ability: 0.72 },
  { dayOffset: -43, mode: SessionMode.TARGETED, axis: AxisType.MOTOR_SKILLS, ability: 0.74 },
  { dayOffset: -38, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.77 },
  { dayOffset: -34, mode: SessionMode.FULL, ability: 0.8 },

  { dayOffset: -27, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.69 },
  { dayOffset: -24, mode: SessionMode.FULL, ability: 0.68 },

  { dayOffset: -19, mode: SessionMode.TARGETED, axis: AxisType.LOGIC, ability: 0.78 },
  { dayOffset: -15, mode: SessionMode.TARGETED, axis: AxisType.VISUAL_DISCRIMINATION, ability: 0.82 },
  { dayOffset: -11, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.85 },
  { dayOffset: -8, mode: SessionMode.TARGETED, axis: AxisType.MOTOR_SKILLS, ability: 0.86 },
  { dayOffset: -5, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.88 },

  { dayOffset: -3, mode: SessionMode.FULL, ability: 0.9 },
];

// Ajoutées après coup et hors de la courbe : elles portent le tag « Familles »
// dans l'historique et sont exclues du meilleur score par le pipeline lui-même.
export const DEMO_FILTERED_PLAN: readonly PlannedSession[] = [
  {
    dayOffset: -2,
    mode: SessionMode.TARGETED,
    axis: AxisType.LOGIC,
    ability: 0.84,
    logicFamily: LogicFamilyFilter.MATRIX,
  },
];

export function abilityForAxis(axis: AxisType, general: number): number {
  if (axis === AxisType.MOTOR_SKILLS) {
    return Math.min(MOTRICITY_ABILITY_CAP, general);
  }
  if (CRITICAL_AXES.includes(axis)) {
    return Math.max(CRITICAL_AXIS_ABILITY_FLOOR, general);
  }
  return general;
}
