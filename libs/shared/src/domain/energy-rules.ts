import { SessionMode } from '../enums';

export const SESSION_ENERGY_COST: Record<SessionMode, number> = {
  [SessionMode.FULL]: 5,
  [SessionMode.TARGETED]: 1,
  [SessionMode.TUTORIAL]: 0,
};

export const ENERGY_INSUFFICIENT_ERROR_CODE = 'ENERGY_INSUFFICIENT';
