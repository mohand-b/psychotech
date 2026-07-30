import { SubscriptionTier } from '../enums';

export interface EnergyStateDto {
  balance: number;
  capacity: number;
  tier: SubscriptionTier;
  resetsAt: string;
  canStartFull: boolean;
  canStartAxis: boolean;
}
