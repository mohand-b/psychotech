import { EnergyPackId } from '../enums';

export interface BillingConfigDto {
  publishableKey: string;
}

export interface PackCheckoutRequestDto {
  packId: EnergyPackId;
}

export interface PackCheckoutSessionDto {
  clientSecret: string;
}

export type PackCheckoutState = 'open' | 'complete' | 'expired';

export interface PackCheckoutStatusDto {
  status: PackCheckoutState;
  credited: boolean;
}
