import { LogicItemStatus } from '@psychotech/shared';

export const LOGIC_STATUS_COLORS: Record<LogicItemStatus, string> = {
  CORRECT: 'var(--axis-logic)',
  WRONG: 'var(--danger)',
  SKIPPED: 'var(--warning)',
  UNREACHED: 'var(--text-disabled)',
};

export const LOGIC_STATUS_LABELS: Record<LogicItemStatus, string> = {
  CORRECT: 'Juste',
  WRONG: 'Erreur',
  SKIPPED: 'Passé',
  UNREACHED: 'Non atteint',
};
