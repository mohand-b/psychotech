import { AxisType, SessionMode } from '@psychotech/shared';

export type SessionHistoryFilter =
  | 'ALL'
  | SessionMode.FULL
  | SessionMode.TARGETED
  | AxisType;

export interface SessionHistorySelection {
  mode: SessionMode | null;
  axis: AxisType | null;
}

export interface SessionHistoryQuery {
  mode?: SessionMode;
  axis?: AxisType;
  cursor?: string;
}

function isModeFilter(
  filter: SessionHistoryFilter,
): filter is SessionMode.FULL | SessionMode.TARGETED {
  return filter === SessionMode.FULL || filter === SessionMode.TARGETED;
}

export function selectionFor(
  filter: SessionHistoryFilter,
): SessionHistorySelection {
  if (filter === 'ALL') {
    return { mode: null, axis: null };
  }
  if (isModeFilter(filter)) {
    return { mode: filter, axis: null };
  }
  return { mode: SessionMode.TARGETED, axis: filter };
}

export function historyQueryFor(
  filter: SessionHistoryFilter,
): SessionHistoryQuery {
  const selection = selectionFor(filter);
  return {
    ...(selection.mode ? { mode: selection.mode } : {}),
    ...(selection.axis ? { axis: selection.axis } : {}),
  };
}

export function isChipActive(
  filter: SessionHistoryFilter,
  chip: SessionHistoryFilter,
): boolean {
  const selection = selectionFor(filter);
  if (chip === 'ALL') {
    return selection.mode === null;
  }
  if (isModeFilter(chip)) {
    return selection.mode === chip;
  }
  return selection.axis === chip;
}

export function areAxisChipsEnabled(filter: SessionHistoryFilter): boolean {
  return selectionFor(filter).mode !== SessionMode.FULL;
}
