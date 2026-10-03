import { AxisType } from '@psychotech/shared';
import { resolveAxisSlug } from './axis-slug';

export function buildSimulationResultRoute(sessionId: string): string[] {
  return ['/sessions', sessionId, 'resultat'];
}

export function buildSimulationSessionRoute(sessionId: string): string[] {
  return ['/entrainements/examen-blanc/session', sessionId];
}

export function buildTargetedAxisRoute(axis: AxisType): string[] {
  return ['/entrainements/cible', resolveAxisSlug(axis)];
}

export function buildTutorialAxisRoute(axis: AxisType): string[] {
  return ['/entrainements/tutoriel', resolveAxisSlug(axis)];
}

export function buildTargetedSessionRoute(
  axis: AxisType,
  sessionId: string,
): string[] {
  return [...buildTargetedAxisRoute(axis), 'session', sessionId];
}

export function buildTargetedResultRoute(
  axis: AxisType,
  sessionId: string,
): string[] {
  return [...buildTargetedSessionRoute(axis, sessionId), 'resultat'];
}

export function buildTargetedCorrectionRoute(
  axis: AxisType,
  sessionId: string,
): string[] {
  return [...buildTargetedSessionRoute(axis, sessionId), 'correction'];
}
