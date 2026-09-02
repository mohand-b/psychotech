import { AxisType, SessionMode, LogicFamilyFilter } from '@psychotech/shared';
import { PlannedSession } from './demo-profile';

export const DEMO_SEED = 'psychotech-vendor-2026-rev3';

export const DEMO_EMAIL = 'john.doe@example.com';
export const DEMO_PASSWORD = 'Ferroviaire2026!';
export const DEMO_FIRST_NAME = 'John';
export const DEMO_LAST_NAME = 'Doe';

export const DEMO_CREDITS = 30;
export const DEMO_WORKING_CREDITS = 500;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// PROFIL VENDEUR — huit semaines, progression nette et crédible :
//   · LOGIQUE en plateau : forte dès le départ, elle n'évolue presque plus
//     (habileté bornée 0.80-0.90, scores ~60-68 tout du long).
//   · RÉACTIVITÉ en fil rouge : elle grimpe régulièrement puis touche 100
//     deux fois en dernière semaine (passes sans faute).
//   · Mémoire, Discrimination et Motricité progressent franchement sans
//     jamais paraître parfaites.
const LOGIC_ABILITY_FLOOR = 0.84;
const LOGIC_ABILITY_CAP = 0.86;
const MEMORY_ABILITY_CAP = 0.83;
const DISCRIMINATION_ABILITY_CAP = 0.85;
const REACTIVITY_ABILITY_CAP = 0.97;
const CRITICAL_AXIS_ABILITY_FLOOR = 0.52;

const MOTRICITY_ABILITY_BASE = 0.34;
const MOTRICITY_ABILITY_SPAN = 0.2;
const MOTRICITY_ABILITY_CEILING = 0.54;

export function abilityForAxis(
  axis: AxisType,
  general: number,
  criticalFloor: number = CRITICAL_AXIS_ABILITY_FLOOR,
): number {
  if (axis === AxisType.LOGIC) {
    return clamp(general, LOGIC_ABILITY_FLOOR, LOGIC_ABILITY_CAP);
  }
  if (axis === AxisType.MEMORY) {
    return clamp(general, criticalFloor, MEMORY_ABILITY_CAP);
  }
  if (axis === AxisType.VISUAL_DISCRIMINATION) {
    return clamp(general * 0.98, criticalFloor, DISCRIMINATION_ABILITY_CAP);
  }
  if (axis === AxisType.REACTIVITY) {
    return clamp(general * 1.05, criticalFloor, REACTIVITY_ABILITY_CAP);
  }
  return clamp(
    MOTRICITY_ABILITY_BASE + general * MOTRICITY_ABILITY_SPAN,
    MOTRICITY_ABILITY_BASE,
    MOTRICITY_ABILITY_CEILING,
  );
}

export const DEMO_PLAN: readonly PlannedSession[] = [
  { dayOffset: -55, mode: SessionMode.FULL, ability: 0.35 },
  { dayOffset: -53, mode: SessionMode.TARGETED, axis: AxisType.LOGIC, ability: 0.4 },
  { dayOffset: -52, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.38 },
  { dayOffset: -50, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.42 },

  { dayOffset: -48, mode: SessionMode.TARGETED, axis: AxisType.VISUAL_DISCRIMINATION, ability: 0.48 },
  { dayOffset: -46, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.5 },
  { dayOffset: -45, mode: SessionMode.FULL, ability: 0.52 },
  { dayOffset: -43, mode: SessionMode.TARGETED, axis: AxisType.MOTOR_SKILLS, ability: 0.5 },

  { dayOffset: -41, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.58 },
  { dayOffset: -39, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.6 },
  { dayOffset: -38, mode: SessionMode.TARGETED, axis: AxisType.LOGIC, ability: 0.6 },
  { dayOffset: -36, mode: SessionMode.FULL, ability: 0.62 },

  { dayOffset: -33, mode: SessionMode.TARGETED, axis: AxisType.VISUAL_DISCRIMINATION, ability: 0.64 },
  { dayOffset: -32, mode: SessionMode.TARGETED, axis: AxisType.MOTOR_SKILLS, ability: 0.63 },
  { dayOffset: -31, mode: SessionMode.FULL, ability: 0.65, abandonAfterAxes: 3 },
  { dayOffset: -29, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.68 },

  // Semaine creuse : une seule session, la reprise est moyenne.
  { dayOffset: -24, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.6 },

  { dayOffset: -20, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.75 },
  { dayOffset: -19, mode: SessionMode.TARGETED, axis: AxisType.MOTOR_SKILLS, ability: 0.72 },
  { dayOffset: -18, mode: SessionMode.FULL, ability: 0.75 },
  { dayOffset: -16, mode: SessionMode.TARGETED, axis: AxisType.VISUAL_DISCRIMINATION, ability: 0.78 },

  // Contre-performance assumée avant la dernière ligne droite.
  { dayOffset: -13, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.62, criticalFloor: 0.55 },
  { dayOffset: -12, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.85 },
  { dayOffset: -11, mode: SessionMode.TARGETED, axis: AxisType.LOGIC, ability: 0.85 },
  { dayOffset: -9, mode: SessionMode.FULL, ability: 0.85 },

  { dayOffset: -6, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.92, flawless: true },
  { dayOffset: -5, mode: SessionMode.TARGETED, axis: AxisType.MOTOR_SKILLS, ability: 0.9 },
  { dayOffset: -4, mode: SessionMode.TARGETED, axis: AxisType.MEMORY, ability: 0.88 },
  { dayOffset: -3, mode: SessionMode.TARGETED, axis: AxisType.REACTIVITY, ability: 0.95, flawless: true },
  { dayOffset: -2, mode: SessionMode.TARGETED, axis: AxisType.VISUAL_DISCRIMINATION, ability: 0.88 },
  { dayOffset: -1, mode: SessionMode.FULL, ability: 0.95 },
];

export const DEMO_FILTERED_PLAN: readonly PlannedSession[] = [
  {
    dayOffset: -2,
    mode: SessionMode.TARGETED,
    axis: AxisType.LOGIC,
    ability: 0.85,
    logicFamily: LogicFamilyFilter.MATRIX,
  },
];
