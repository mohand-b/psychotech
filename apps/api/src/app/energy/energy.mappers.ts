import { EnergyLedgerReason as DbEnergyLedgerReason } from '@prisma/client';
import { EnergyLedgerReason } from '@psychotech/shared';

const DB_REASON_BY_SHARED: Record<EnergyLedgerReason, DbEnergyLedgerReason> = {
  [EnergyLedgerReason.DAILY_RESET]: DbEnergyLedgerReason.DAILY_RESET,
  [EnergyLedgerReason.SESSION_SPENT]: DbEnergyLedgerReason.SESSION_SPENT,
  [EnergyLedgerReason.AXIS_SPENT]: DbEnergyLedgerReason.AXIS_SPENT,
  [EnergyLedgerReason.REFUND]: DbEnergyLedgerReason.REFUND,
  [EnergyLedgerReason.ADMIN_GRANT]: DbEnergyLedgerReason.ADMIN_GRANT,
};

export function toDbReason(reason: EnergyLedgerReason): DbEnergyLedgerReason {
  return DB_REASON_BY_SHARED[reason];
}
