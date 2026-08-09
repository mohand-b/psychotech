export interface EnergyStateDto {
  balance: number;
  canStartFull: boolean;
  canStartAxis: boolean;
}

export interface RedeemGiftCodeDto {
  code: string;
}

export interface GiftCodeRedemptionDto {
  granted: number;
  balance: number;
}

export const GIFT_CODE_INVALID_ERROR_CODE = 'GIFT_CODE_INVALID';
