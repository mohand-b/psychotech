import { AxisType, MemoryPhase } from '../enums';
import { generateDiscriminationSession } from '../exercises/discrimination';
import { generateLogicSession } from '../exercises/logic';
import { generateMemorySession } from '../exercises/memory';
import { generateMotricityCourses } from '../exercises/motricity';
import { generateReactivitySession } from '../exercises/reactivity';
import {
  AXIS_TUTORIAL,
  MOTRICITY_TUTORIAL_START_WIDTH,
  TUTORIAL_SEED,
} from './axis-tutorial';

const MOTRICITY_TUTORIAL_OPTIONS = {
  courseCount: 1,
  startWidths: [MOTRICITY_TUTORIAL_START_WIDTH],
};

describe('AXIS_TUTORIAL', () => {
  it('generates the exact same tutorial items on every run', () => {
    expect(
      generateLogicSession(TUTORIAL_SEED, AXIS_TUTORIAL[AxisType.LOGIC]),
    ).toEqual(
      generateLogicSession(TUTORIAL_SEED, AXIS_TUTORIAL[AxisType.LOGIC]),
    );
    expect(
      generateMemorySession(TUTORIAL_SEED, AXIS_TUTORIAL[AxisType.MEMORY]),
    ).toEqual(
      generateMemorySession(TUTORIAL_SEED, AXIS_TUTORIAL[AxisType.MEMORY]),
    );
    expect(
      generateDiscriminationSession(
        TUTORIAL_SEED,
        AXIS_TUTORIAL[AxisType.VISUAL_DISCRIMINATION],
      ),
    ).toEqual(
      generateDiscriminationSession(
        TUTORIAL_SEED,
        AXIS_TUTORIAL[AxisType.VISUAL_DISCRIMINATION],
      ),
    );
    expect(
      generateReactivitySession(
        TUTORIAL_SEED,
        AXIS_TUTORIAL[AxisType.REACTIVITY],
      ),
    ).toEqual(
      generateReactivitySession(
        TUTORIAL_SEED,
        AXIS_TUTORIAL[AxisType.REACTIVITY],
      ),
    );
    expect(
      generateMotricityCourses(TUTORIAL_SEED, MOTRICITY_TUTORIAL_OPTIONS),
    ).toEqual(
      generateMotricityCourses(TUTORIAL_SEED, MOTRICITY_TUTORIAL_OPTIONS),
    );
  });

  it('produces the reduced logic tutorial: 5 items in 60 seconds', () => {
    const config = AXIS_TUTORIAL[AxisType.LOGIC];
    const items = generateLogicSession(TUTORIAL_SEED, config);
    expect(items).toHaveLength(5);
    expect(config.timer.durationSec).toBe(60);
  });

  it('produces the reduced memory tutorial: one normal median-length sequence', () => {
    const sequences = generateMemorySession(
      TUTORIAL_SEED,
      AXIS_TUTORIAL[AxisType.MEMORY],
    );
    expect(sequences).toHaveLength(1);
    expect(sequences[0].phase).toBe(MemoryPhase.NORMAL);
    expect(sequences[0].elements).toHaveLength(5);
  });

  it('produces the reduced discrimination tutorial: 5 mixed trials in 60 seconds', () => {
    const config = AXIS_TUTORIAL[AxisType.VISUAL_DISCRIMINATION];
    const trials = generateDiscriminationSession(TUTORIAL_SEED, config);
    expect(trials).toHaveLength(5);
    expect(trials.some((trial) => trial.identical)).toBe(true);
    expect(trials.some((trial) => !trial.identical)).toBe(true);
    expect(config.timer.durationSec).toBe(60);
  });

  it('produces the reduced reactivity tutorial: three 10-second phases', () => {
    const config = AXIS_TUTORIAL[AxisType.REACTIVITY];
    const stimuli = generateReactivitySession(TUTORIAL_SEED, config);
    expect(config.timer.durationSec).toBe(30);
    expect(config.phaseDurationSec).toBe(10);
    expect(stimuli.length).toBeGreaterThan(0);
    for (const stimulus of stimuli) {
      expect(stimulus.appearAtMs + config.responseWindowMs).toBeLessThanOrEqual(
        config.timer.durationSec * 1000,
      );
    }
  });

  it('produces the reduced motricity tutorial: one widened easy course', () => {
    const courses = generateMotricityCourses(
      TUTORIAL_SEED,
      MOTRICITY_TUTORIAL_OPTIONS,
    );
    expect(courses).toHaveLength(1);
    expect(courses[0].segments[0].width).toBe(MOTRICITY_TUTORIAL_START_WIDTH);
    expect(AXIS_TUTORIAL[AxisType.MOTOR_SKILLS].secondsPerCourse).toBe(90);
  });

  it('keeps the standard generations untouched by the new optional parameters', () => {
    expect(generateDiscriminationSession('seed-standard')).toEqual(
      generateDiscriminationSession('seed-standard'),
    );
    expect(generateMotricityCourses('seed-standard')).toHaveLength(3);
    expect(generateMotricityCourses('seed-standard')[0].segments[0].width).toBe(
      68,
    );
  });
});
