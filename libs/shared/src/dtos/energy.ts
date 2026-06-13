import { EnergyLedgerReason } from '../enums';

export interface EnergyWalletDto {
  balance: number;
  capacity: number;
  lastResetAt: string;
}

export interface EnergyLedgerEntryDto {
  delta: number;
  reason: EnergyLedgerReason;
  balanceAfter: number;
  sessionId: string | null;
  createdAt: string;
}
