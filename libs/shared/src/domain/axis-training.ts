import { AxisTimerModel, AxisType, MemoryPhase } from '../enums';

export interface AxisBriefing {
  consigne: string;
  objectif: string;
}

export interface GlobalAxisTimer {
  model: AxisTimerModel.GLOBAL;
  durationSec: number;
}

export interface PerExerciseAxisTimer {
  model: AxisTimerModel.PER_EXERCISE;
}

export type AxisTimer = GlobalAxisTimer | PerExerciseAxisTimer;

export interface MemorySequenceConfig {
  phase: MemoryPhase;
  length: number;
}

interface BaseAxisTraining {
  timer: AxisTimer;
  exerciseCount: number;
  briefing: AxisBriefing;
}

export interface LogicTraining extends BaseAxisTraining {
  axis: AxisType.LOGIC;
  timer: GlobalAxisTimer;
  difficultyLevels: number;
}

export interface MemoryTraining extends BaseAxisTraining {
  axis: AxisType.MEMORY;
  timer: PerExerciseAxisTimer;
  elementDisplaySec: number;
  restitutionSec: number;
  sequences: MemorySequenceConfig[];
}

export interface VisualDiscriminationTraining extends BaseAxisTraining {
  axis: AxisType.VISUAL_DISCRIMINATION;
  timer: GlobalAxisTimer;
  increasingDifficulty: boolean;
  minSequenceLength: number;
  maxSequenceLength: number;
}

export interface ReactivityTraining extends BaseAxisTraining {
  axis: AxisType.REACTIVITY;
  timer: GlobalAxisTimer;
  approximateStimulusCount: number;
  phaseDurationSec: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  responseWindowMs: number;
  anticipationThresholdMs: number;
}

export interface MotorSkillsTraining extends BaseAxisTraining {
  axis: AxisType.MOTOR_SKILLS;
  timer: PerExerciseAxisTimer;
  secondsPerCourse: number;
  pauseBetweenCoursesSec: number;
  increasingDifficulty: boolean;
}

export type AxisTraining =
  | LogicTraining
  | MemoryTraining
  | VisualDiscriminationTraining
  | ReactivityTraining
  | MotorSkillsTraining;

export type RailwayPlayableAxis = AxisTraining['axis'];

export const FULL_SESSION_AXIS_ORDER: readonly RailwayPlayableAxis[] = [
  AxisType.LOGIC,
  AxisType.MEMORY,
  AxisType.VISUAL_DISCRIMINATION,
  AxisType.REACTIVITY,
  AxisType.MOTOR_SKILLS,
];

export const AXIS_TRAINING: {
  [Axis in RailwayPlayableAxis]: Extract<AxisTraining, { axis: Axis }>;
} = {
  [AxisType.LOGIC]: {
    axis: AxisType.LOGIC,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 600 },
    exerciseCount: 40,
    difficultyLevels: 5,
    briefing: {
      consigne:
        'Complétez chaque suite logique en choisissant la bonne réponse. Vous pouvez passer un item et y revenir tant que le chrono tourne.',
      objectif: 'Raisonnement logique et gestion de votre temps.',
    },
  },
  [AxisType.MEMORY]: {
    axis: AxisType.MEMORY,
    timer: { model: AxisTimerModel.PER_EXERCISE },
    exerciseCount: 5,
    elementDisplaySec: 1,
    restitutionSec: 30,
    sequences: [
      { phase: MemoryPhase.NORMAL, length: 4 },
      { phase: MemoryPhase.NORMAL, length: 5 },
      { phase: MemoryPhase.NORMAL, length: 6 },
      { phase: MemoryPhase.INVERSE, length: 4 },
      { phase: MemoryPhase.INVERSE, length: 5 },
    ],
    briefing: {
      consigne:
        "Mémorisez la séquence affichée, puis restituez-la dans l'ordre, puis à l'envers. Chaque séquence est un peu plus longue.",
      objectif: 'Mémoire de travail : retenir, puis manipuler.',
    },
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    axis: AxisType.VISUAL_DISCRIMINATION,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 180 },
    exerciseCount: 36,
    increasingDifficulty: true,
    minSequenceLength: 5,
    maxSequenceLength: 8,
    briefing: {
      consigne:
        "Comparez les deux suites et indiquez si elles sont identiques ou différentes. L'essai suivant s'enchaîne aussitôt.",
      objectif: 'Comparaison visuelle rapide et fiable.',
    },
  },
  [AxisType.REACTIVITY]: {
    axis: AxisType.REACTIVITY,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 180 },
    exerciseCount: 1,
    approximateStimulusCount: 45,
    phaseDurationSec: 60,
    minIntervalMs: 1500,
    maxIntervalMs: 4000,
    responseWindowMs: 1500,
    anticipationThresholdMs: 150,
    briefing: {
      consigne:
        "Trois signaux, trois commandes. L'épreuve commence avec un seul signal - les autres s'ajoutent en cours de route et seront annoncés. Réagissez le plus vite possible avec la bonne commande.",
      objectif: 'Vitesse de réaction, régularité et précision des commandes.',
    },
  },
  [AxisType.MOTOR_SKILLS]: {
    axis: AxisType.MOTOR_SKILLS,
    timer: { model: AxisTimerModel.PER_EXERCISE },
    exerciseCount: 3,
    secondsPerCourse: 90,
    pauseBetweenCoursesSec: 10,
    increasingDifficulty: true,
    briefing: {
      consigne:
        "Pilotez le curseur à deux mains pour suivre au plus près le centre du couloir, jusqu'au bout des 3 parcours.",
      objectif: 'Coordination des deux mains et précision du tracé.',
    },
  },
};
