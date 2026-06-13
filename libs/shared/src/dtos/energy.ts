import { EnergyLedgerReason, SubscriptionTier } from '../enums';

export interface EnergyWalletDto {
  balance: number;
  capacity: number;
  lastResetAt: string;
}

export interface EnergyStateDto {
  balance: number;
  capacity: number;
  tier: SubscriptionTier;
  resetsAt: string;
  canStartFull: boolean;
  canStartAxis: boolean;
}

export interface EnergyLedgerEntryDto {
  delta: number;
  reason: EnergyLedgerReason;
  balanceAfter: number;
  sessionId: string | null;
  createdAt: string;
}
