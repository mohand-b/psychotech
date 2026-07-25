import { SessionMode } from '../enums';

export const ENERGY_CAPACITY = 5;

export const ENERGY_UNIT_PRICE_EUR = 0.2;

export const SESSION_ENERGY_COST: Record<SessionMode, number> = {
  [SessionMode.FULL]: 5,
  [SessionMode.TARGETED]: 1,
  [SessionMode.TUTORIAL]: 0,
};

export const ENERGY_PACK_SIZE = 5;

export const ENERGY_PACK_PRICE_EUR = ENERGY_PACK_SIZE * ENERGY_UNIT_PRICE_EUR;

export const ENERGY_INSUFFICIENT_ERROR_CODE = 'ENERGY_INSUFFICIENT';

export const ENERGY_NO_PAYMENT_METHOD_ERROR_CODE = 'ENERGY_NO_PAYMENT_METHOD';

export const ENERGY_PAYMENT_DECLINED_ERROR_CODE = 'ENERGY_PAYMENT_DECLINED';
