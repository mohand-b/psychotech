import { SessionMode } from '../enums';
import {
  FULL_SESSION_LABEL,
  FULL_SESSION_LABEL_LOWER,
  FULL_SESSION_LABEL_PLURAL,
  FULL_SESSION_LABEL_PLURAL_LOWER,
  FULL_SESSION_REPORT_LABEL,
  SESSION_MODE_LABELS,
  SESSION_MODE_LABELS_LOWER,
  TARGETED_SESSION_LABEL,
  fullSessionCountLabel,
} from './session-vocabulary';

const ALL_LABELS = [
  FULL_SESSION_LABEL,
  FULL_SESSION_LABEL_LOWER,
  FULL_SESSION_LABEL_PLURAL,
  FULL_SESSION_LABEL_PLURAL_LOWER,
  FULL_SESSION_REPORT_LABEL,
  TARGETED_SESSION_LABEL,
  ...Object.values(SESSION_MODE_LABELS),
  ...Object.values(SESSION_MODE_LABELS_LOWER),
];

describe('session vocabulary', () => {
  it('names a full session an examen blanc', () => {
    expect(FULL_SESSION_LABEL).toBe('Examen blanc');
    expect(SESSION_MODE_LABELS[SessionMode.FULL]).toBe('Examen blanc');
  });

  it('names a targeted session an entraînement ciblé', () => {
    expect(SESSION_MODE_LABELS[SessionMode.TARGETED]).toBe(
      'Entraînement ciblé',
    );
  });

  it('covers every session mode', () => {
    for (const mode of Object.values(SessionMode)) {
      expect(SESSION_MODE_LABELS[mode].length).toBeGreaterThan(0);
      expect(SESSION_MODE_LABELS_LOWER[mode].length).toBeGreaterThan(0);
    }
  });

  it('agrees the count label in number', () => {
    expect(fullSessionCountLabel(0)).toBe('examen blanc');
    expect(fullSessionCountLabel(1)).toBe('examen blanc');
    expect(fullSessionCountLabel(2)).toBe('examens blancs');
  });

  it('never says simulation anywhere in the user vocabulary', () => {
    for (const label of ALL_LABELS) {
      expect(label.toLowerCase()).not.toContain('simulation');
    }
  });
});
