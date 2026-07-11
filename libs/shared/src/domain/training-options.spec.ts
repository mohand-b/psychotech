import { AxisType } from '../enums';
import {
  AXIS_TRAINING_OPTIONS,
  TrainingOptionId,
  trainingOptionsForAxis,
} from './training-options';

describe('AXIS_TRAINING_OPTIONS', () => {
  it('offers help and no-timer for logic', () => {
    expect(trainingOptionsForAxis(AxisType.LOGIC).map(({ id }) => id)).toEqual([
      TrainingOptionId.LOGIC_HELP,
      TrainingOptionId.NO_TIMER,
    ]);
  });

  it('offers only no-timer for visual discrimination', () => {
    expect(
      trainingOptionsForAxis(AxisType.VISUAL_DISCRIMINATION).map(
        ({ id }) => id,
      ),
    ).toEqual([TrainingOptionId.NO_TIMER]);
  });

  it('offers a single live-feedback option for reactivity and motor skills', () => {
    expect(
      trainingOptionsForAxis(AxisType.REACTIVITY).map(({ id }) => id),
    ).toEqual([TrainingOptionId.REACTIVITY_LIVE_METRICS]);
    expect(
      trainingOptionsForAxis(AxisType.MOTOR_SKILLS).map(({ id }) => id),
    ).toEqual([TrainingOptionId.MOTOR_LIVE_ERROR_COUNTERS]);
  });

  it('offers no option for memory', () => {
    expect(trainingOptionsForAxis(AxisType.MEMORY)).toEqual([]);
  });

  it('keeps labels and descriptions free of em dashes', () => {
    for (const options of Object.values(AXIS_TRAINING_OPTIONS)) {
      for (const option of options) {
        expect(option.label).not.toContain('—');
        expect(option.description).not.toContain('—');
      }
    }
  });
});
