import { AxisType } from '../enums';
import {
  AXIS_TRAINING_OPTIONS,
  TrainingOptionId,
  trainingOptionForAxis,
} from './training-options';

describe('AXIS_TRAINING_OPTIONS', () => {
  it('offers exactly one option for logic, reactivity and motor skills', () => {
    expect(trainingOptionForAxis(AxisType.LOGIC)?.id).toBe(
      TrainingOptionId.LOGIC_HELP,
    );
    expect(trainingOptionForAxis(AxisType.REACTIVITY)?.id).toBe(
      TrainingOptionId.REACTIVITY_LIVE_METRICS,
    );
    expect(trainingOptionForAxis(AxisType.MOTOR_SKILLS)?.id).toBe(
      TrainingOptionId.MOTOR_LIVE_ERROR_COUNTERS,
    );
    expect(Object.keys(AXIS_TRAINING_OPTIONS)).toHaveLength(3);
  });

  it('offers no option for memory and visual discrimination', () => {
    expect(trainingOptionForAxis(AxisType.MEMORY)).toBeNull();
    expect(trainingOptionForAxis(AxisType.VISUAL_DISCRIMINATION)).toBeNull();
  });

  it('keeps labels and descriptions free of em dashes', () => {
    for (const option of Object.values(AXIS_TRAINING_OPTIONS)) {
      expect(option.label).not.toContain('—');
      expect(option.description).not.toContain('—');
    }
  });
});
