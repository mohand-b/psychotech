import {
  AxisType,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { axisSlug } from '../../shared/util/axis-slug';

export function simulationCurrentAxis(session: SessionDto): AxisType | null {
  return session.axisResults[session.currentAxisIndex]?.axis ?? null;
}

export function afterAxisSubmitRoute(
  session: SessionDto,
  axis: AxisType,
): string[] {
  if (session.mode !== SessionMode.FULL) {
    return [
      '/entrainements/cible',
      axisSlug(axis),
      'session',
      session.id,
      'resultat',
    ];
  }
  if (session.status === SessionStatus.COMPLETED) {
    return ['/sessions', session.id, 'resultat'];
  }
  return ['/entrainements/simulation/session', session.id];
}
