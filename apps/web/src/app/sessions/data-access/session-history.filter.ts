import { AxisType, SessionMode } from '@psychotech/shared';

export type SessionHistoryFilter =
  | 'ALL'
  | SessionMode.FULL
  | SessionMode.TARGETED
  | AxisType;

export interface SessionHistoryQuery {
  mode?: SessionMode;
  axis?: AxisType;
  cursor?: string;
}

export function historyQueryFor(
  filter: SessionHistoryFilter,
): SessionHistoryQuery {
  if (filter === 'ALL') {
    return {};
  }
  if (filter === SessionMode.FULL || filter === SessionMode.TARGETED) {
    return { mode: filter };
  }
  return { axis: filter };
}
