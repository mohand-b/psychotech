import { AxisType, LogicFamilyFilter } from '../enums';
import {
  AXIS_TRAINING_OPTIONS,
  TrainingOptionId,
  excludedFromRecords,
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

  it('excludes from records any session with a family filter or without timer', () => {
    expect(excludedFromRecords(LogicFamilyFilter.MATRIX, [])).toBe(true);
    expect(excludedFromRecords(null, [TrainingOptionId.NO_TIMER])).toBe(true);
    expect(
      excludedFromRecords(LogicFamilyFilter.DOMINO, [
        TrainingOptionId.NO_TIMER,
      ]),
    ).toBe(true);
  });

  it('keeps in records a session with only non-distorting options', () => {
    expect(excludedFromRecords(null, [])).toBe(false);
    expect(excludedFromRecords(null, [TrainingOptionId.LOGIC_HELP])).toBe(
      false,
    );
    expect(
      excludedFromRecords(null, [TrainingOptionId.REACTIVITY_LIVE_METRICS]),
    ).toBe(false);
    expect(
      excludedFromRecords(null, [TrainingOptionId.MOTOR_LIVE_ERROR_COUNTERS]),
    ).toBe(false);
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
