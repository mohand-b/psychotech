export type ReactivityStimulusType = 'YELLOW' | 'BLUE' | 'RED';

export type ReactivityCommand = 'LEFT' | 'RIGHT' | 'SPACE';

export type ReactivityClassification =
  | 'VALID'
  | 'ANTICIPATION'
  | 'OMISSION'
  | 'WRONG_COMMAND';

export interface ReactivityStimulusPosition {
  fx: number;
  fy: number;
}

export interface ReactivityStimulus {
  index: number;
  type: ReactivityStimulusType;
  appearAtMs: number;
  position: ReactivityStimulusPosition;
}

export const REACTIVITY_COMMAND_BY_TYPE: Record<
  ReactivityStimulusType,
  ReactivityCommand
> = {
  YELLOW: 'LEFT',
  BLUE: 'RIGHT',
  RED: 'SPACE',
};
