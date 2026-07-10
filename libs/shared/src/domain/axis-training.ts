import { AxisTimerModel, AxisType, MemoryPhase } from '../enums';

export interface AxisBriefing {
  exerciseName: string;
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

export const AXIS_TRAINING: {
  [Axis in RailwayPlayableAxis]: Extract<AxisTraining, { axis: Axis }>;
} = {
  [AxisType.LOGIC]: {
    axis: AxisType.LOGIC,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 600 },
    exerciseCount: 40,
    difficultyLevels: 5,
    briefing: {
      exerciseName: 'Suites logiques',
      consigne:
        "Une suite de nombres s'affiche, avec un élément manquant. Identifiez la règle qui relie les éléments, puis choisissez la bonne réponse parmi les quatre propositions.",
      objectif:
        "Répondre juste, vite, et garder un rythme régulier sur l'ensemble des items. La précision compte davantage que la vitesse.",
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
      exerciseName: 'Séquences à mémoriser',
      consigne:
        "Une séquence de chiffres s'affiche brièvement, puis disparaît. Restituez-la dans l'ordre demandé : ordre normal en phase 1, ordre inversé en phase 2.",
      objectif:
        'Allonger votre longueur de séquence mémorisée : chaque restitution réussie ajoute un élément à la suivante.',
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
      exerciseName: 'Comparaison de suites',
      consigne:
        "Deux suites de caractères s'affichent (chiffres, lettres, formes). Décidez si elles sont strictement identiques ou différentes - un seul caractère peut changer.",
      objectif:
        'Décider vite sans fausses alertes : la précision sur les suites longues compte autant que le temps de décision.',
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
      exerciseName: 'Temps de réaction',
      consigne:
        "Touchez la zone dès qu'un stimulus apparaît. En seconde partie, une règle d'inhibition s'ajoute : ne réagissez pas aux stimulus rouges.",
      objectif:
        "Un temps de réaction court et stable, sans anticipation ni omission. C'est l'axe critique des sélections ferroviaires.",
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
      exerciseName: 'Coordination bimanuelle',
      consigne:
        'Guidez le curseur de START à END sans sortir du couloir. Chaque main pilote une direction : la gauche va à gauche et à droite, la droite monte et descend.',
      objectif:
        'Dissocier les deux mains : une trajectoire fluide, sans contact avec les bords (erreur mineure) ni sortie du couloir (erreur majeure).',
    },
  },
};
