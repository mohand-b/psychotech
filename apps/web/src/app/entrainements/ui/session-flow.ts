import {
  AxisType,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { TUTORIAL_SESSION_ID } from '../data-access/tutorial-session.facade';
import {
  sessionResultRoute,
  simulationSessionRoute,
  targetedResultRoute,
  tutorialAxisRoute,
} from '../../shared/util/session-links';

export function simulationCurrentAxis(session: SessionDto): AxisType | null {
  return session.axisResults[session.currentAxisIndex]?.axis ?? null;
}

export function afterAxisSubmitRoute(
  session: SessionDto,
  axis: AxisType,
): string[] {
  if (session.id === TUTORIAL_SESSION_ID) {
    return [...tutorialAxisRoute(axis), 'fin'];
  }
  if (session.mode !== SessionMode.FULL) {
    return targetedResultRoute(axis, session.id);
  }
  if (session.status === SessionStatus.COMPLETED) {
    return sessionResultRoute(session.id);
  }
  return simulationSessionRoute(session.id);
}

export function inactiveSessionRoute(
  session: SessionDto,
  axis: AxisType,
): string[] {
  return session.status === SessionStatus.COMPLETED
    ? afterAxisSubmitRoute(session, axis)
    : ['/entrainements'];
}
