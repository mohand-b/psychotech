import { SessionMode } from '../enums';

export const FULL_SESSION_LABEL = 'Examen blanc';
export const FULL_SESSION_LABEL_LOWER = 'examen blanc';
export const FULL_SESSION_LABEL_PLURAL = 'Examens blancs';
export const FULL_SESSION_LABEL_PLURAL_LOWER = 'examens blancs';
export const FULL_SESSION_REPORT_LABEL = "Bilan d'examen blanc";

export const ELIMINATORY_AXIS_VERDICT_NOTE =
  `En ${FULL_SESSION_LABEL_LOWER}, un axe critique sous son seuil éliminatoire ` +
  `rend l'avis défavorable quel que soit le score global.`;

export const DISCOVERY_SESSION_LABEL = 'Mode découverte';
export const DISCOVERY_SESSION_LABEL_LOWER = 'mode découverte';

export const TARGETED_SESSION_LABEL = 'Entraînement ciblé';
export const TARGETED_SESSION_LABEL_LOWER = 'entraînement ciblé';
export const TARGETED_SESSION_LABEL_PLURAL = 'Entraînements ciblés';

export const SESSION_MODE_LABELS: Record<SessionMode, string> = {
  [SessionMode.FULL]: FULL_SESSION_LABEL,
  [SessionMode.TARGETED]: TARGETED_SESSION_LABEL,
  [SessionMode.TUTORIAL]: DISCOVERY_SESSION_LABEL,
};

export const SESSION_MODE_LABELS_LOWER: Record<SessionMode, string> = {
  [SessionMode.FULL]: FULL_SESSION_LABEL_LOWER,
  [SessionMode.TARGETED]: TARGETED_SESSION_LABEL_LOWER,
  [SessionMode.TUTORIAL]: DISCOVERY_SESSION_LABEL_LOWER,
};

export function fullSessionCountLabel(count: number): string {
  return count > 1 ? FULL_SESSION_LABEL_PLURAL_LOWER : FULL_SESSION_LABEL_LOWER;
}
