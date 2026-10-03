import {
  AxisType,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { TUTORIAL_SESSION_ID } from '../data-access/tutorial-session.facade';
import {
  buildSimulationResultRoute,
  buildSimulationSessionRoute,
  buildTargetedResultRoute,
  buildTutorialAxisRoute,
} from '../../shared/util/session-links';

export function findCurrentSimulationAxis(
  session: SessionDto,
): AxisType | null {
  return session.axisResults[session.currentAxisIndex]?.axis ?? null;
}

export function resolveRouteAfterAxis(
  session: SessionDto,
  axis: AxisType,
): string[] {
  if (session.id === TUTORIAL_SESSION_ID) {
    return [...buildTutorialAxisRoute(axis), 'fin'];
  }
  if (session.mode !== SessionMode.FULL) {
    return buildTargetedResultRoute(axis, session.id);
  }
  if (session.status === SessionStatus.COMPLETED) {
    return buildSimulationResultRoute(session.id);
  }
  return buildSimulationSessionRoute(session.id);
}

export function resolveInactiveSessionRoute(
  session: SessionDto,
  axis: AxisType,
): string[] {
  return session.status === SessionStatus.COMPLETED
    ? resolveRouteAfterAxis(session, axis)
    : ['/entrainements'];
}
