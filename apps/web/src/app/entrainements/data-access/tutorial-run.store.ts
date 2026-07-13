import {
  AxisType,
  DiscriminationTrialAnswerDto,
  LogicItemAnswerDto,
  MemorySequenceAnswerDto,
  MotricityCourseTrajectoryDto,
  ReactivityStimulusAnswerDto,
  ReactivityWaitPressDto,
} from '@psychotech/shared';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';

export type TutorialRunResult =
  | { axis: AxisType.LOGIC; items: LogicItemAnswerDto[] }
  | { axis: AxisType.MEMORY; sequences: MemorySequenceAnswerDto[] }
  | {
      axis: AxisType.VISUAL_DISCRIMINATION;
      trials: DiscriminationTrialAnswerDto[];
    }
  | {
      axis: AxisType.REACTIVITY;
      stimuli: ReactivityStimulusAnswerDto[];
      waitPresses: ReactivityWaitPressDto[];
      playedMs: number;
    }
  | {
      axis: AxisType.MOTOR_SKILLS;
      courses: MotricityCourseTrajectoryDto[];
    };

interface TutorialRunState {
  result: TutorialRunResult | null;
}

const initialState: TutorialRunState = {
  result: null,
};

export const TutorialRunStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store) => ({
    setResult(result: TutorialRunResult | null): void {
      patchState(store, { result });
    },
  })),
);
