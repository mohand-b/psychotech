import { AxisTimerModel, AxisType, MemoryPhase } from '../enums';

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
  identicalMin?: number;
  identicalMax?: number;
}

export const REACTIVITY_ISI_MIN_MS = 1500;
export const REACTIVITY_ISI_MAX_MS = 2500;

export interface ReactivityTraining extends BaseAxisTraining {
  axis: AxisType.REACTIVITY;
  timer: GlobalAxisTimer;
  approximateStimulusCount: number;
  phaseDurationSec: number;
  isiMinMs: number;
  isiMaxMs: number;
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

export function axisMaxDurationSec(axis: RailwayPlayableAxis): number {
  const training = AXIS_TRAINING[axis];
  switch (training.axis) {
    case AxisType.LOGIC:
    case AxisType.VISUAL_DISCRIMINATION:
    case AxisType.REACTIVITY:
      return training.timer.durationSec;
    case AxisType.MEMORY:
      return training.sequences.reduce(
        (total, sequence) =>
          total +
          sequence.length * training.elementDisplaySec +
          training.restitutionSec,
        0,
      );
    case AxisType.MOTOR_SKILLS:
      return (
        training.exerciseCount * training.secondsPerCourse +
        (training.exerciseCount - 1) * training.pauseBetweenCoursesSec
      );
  }
}

export const AXIS_TRAINING: {
  [Axis in RailwayPlayableAxis]: Extract<AxisTraining, { axis: Axis }>;
} = {
  [AxisType.LOGIC]: {
    axis: AxisType.LOGIC,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 600 },
    exerciseCount: 40,
    difficultyLevels: 5,
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
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    axis: AxisType.VISUAL_DISCRIMINATION,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 180 },
    exerciseCount: 36,
    increasingDifficulty: true,
    minSequenceLength: 5,
    maxSequenceLength: 8,
  },
  [AxisType.REACTIVITY]: {
    axis: AxisType.REACTIVITY,
    timer: { model: AxisTimerModel.GLOBAL, durationSec: 120 },
    exerciseCount: 1,
    approximateStimulusCount: 60,
    phaseDurationSec: 40,
    isiMinMs: REACTIVITY_ISI_MIN_MS,
    isiMaxMs: REACTIVITY_ISI_MAX_MS,
    responseWindowMs: 1500,
    anticipationThresholdMs: 150,
  },
  [AxisType.MOTOR_SKILLS]: {
    axis: AxisType.MOTOR_SKILLS,
    timer: { model: AxisTimerModel.PER_EXERCISE },
    exerciseCount: 3,
    secondsPerCourse: 90,
    pauseBetweenCoursesSec: 10,
    increasingDifficulty: true,
  },
};
