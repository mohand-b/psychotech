import { AxisTimerModel, AxisType, MemoryPhase } from '../enums';
import {
  AxisTraining,
  RailwayPlayableAxis,
  REACTIVITY_ISI_MAX_MS,
  REACTIVITY_ISI_MIN_MS,
} from './axis-training';

export const TUTORIAL_SEED = 'psychotech-tutoriel-v1';

export const MOTRICITY_TUTORIAL_START_WIDTH = 84;

export const AXIS_TUTORIAL: {
  [Axis in RailwayPlayableAxis]: Extract<AxisTraining, { axis: Axis }>;
} = {
  [AxisType.LOGIC]: {
    axis: AxisType.LOGIC,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 60 },
    exerciseCount: 5,
    difficultyLevels: 5,
    briefing: {
      consigne:
        'Résolvez chaque item : suite, triangle, domino ou matrice, par choix de réponse ou saisie directe. Vous pouvez passer un item et y revenir tant que le chrono tourne.',
      objectif: "Découvrir l'épreuve de raisonnement logique.",
    },
  },
  [AxisType.MEMORY]: {
    axis: AxisType.MEMORY,
    timer: { model: AxisTimerModel.PER_EXERCISE },
    exerciseCount: 1,
    elementDisplaySec: 1,
    restitutionSec: 30,
    sequences: [{ phase: MemoryPhase.NORMAL, length: 5 }],
    briefing: {
      consigne:
        "Mémorisez la séquence affichée, puis restituez-la dans l'ordre.",
      objectif: "Découvrir l'épreuve de mémoire de travail.",
    },
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    axis: AxisType.VISUAL_DISCRIMINATION,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 60 },
    exerciseCount: 5,
    increasingDifficulty: true,
    minSequenceLength: 5,
    maxSequenceLength: 8,
    identicalMin: 2,
    identicalMax: 3,
    briefing: {
      consigne:
        "Comparez les deux suites et indiquez si elles sont identiques ou différentes. L'essai suivant s'enchaîne aussitôt.",
      objectif: "Découvrir l'épreuve de comparaison visuelle.",
    },
  },
  [AxisType.REACTIVITY]: {
    axis: AxisType.REACTIVITY,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 30 },
    exerciseCount: 1,
    approximateStimulusCount: 15,
    phaseDurationSec: 10,
    isiMinMs: REACTIVITY_ISI_MIN_MS,
    isiMaxMs: REACTIVITY_ISI_MAX_MS,
    responseWindowMs: 1500,
    anticipationThresholdMs: 150,
    briefing: {
      consigne:
        "Trois signaux, trois commandes. L'épreuve commence avec un seul signal - les autres s'ajoutent en cours de route et seront annoncés. Réagissez le plus vite possible avec la bonne commande.",
      objectif: "Découvrir l'épreuve de réactivité.",
    },
  },
  [AxisType.MOTOR_SKILLS]: {
    axis: AxisType.MOTOR_SKILLS,
    timer: { model: AxisTimerModel.PER_EXERCISE },
    exerciseCount: 1,
    secondsPerCourse: 90,
    pauseBetweenCoursesSec: 10,
    increasingDifficulty: false,
    briefing: {
      consigne:
        "Pilotez le curseur à deux mains pour suivre au plus près le centre du couloir, jusqu'au bout du parcours.",
      objectif: "Découvrir l'épreuve de coordination.",
    },
  },
};
