import { AxisType } from '@psychotech/shared';
import { axisSlug } from './axis-slug';

export function sessionResultRoute(sessionId: string): string[] {
  return ['/sessions', sessionId, 'resultat'];
}

export function simulationSessionRoute(sessionId: string): string[] {
  return ['/entrainements/examen-blanc/session', sessionId];
}

export function targetedAxisRoute(axis: AxisType): string[] {
  return ['/entrainements/cible', axisSlug(axis)];
}

export function tutorialAxisRoute(axis: AxisType): string[] {
  return ['/entrainements/tutoriel', axisSlug(axis)];
}

export function targetedSessionRoute(
  axis: AxisType,
  sessionId: string,
): string[] {
  return [...targetedAxisRoute(axis), 'session', sessionId];
}

export function targetedResultRoute(
  axis: AxisType,
  sessionId: string,
): string[] {
  return [...targetedSessionRoute(axis, sessionId), 'resultat'];
}

export function targetedCorrectionRoute(
  axis: AxisType,
  sessionId: string,
): string[] {
  return [...targetedSessionRoute(axis, sessionId), 'correction'];
}
