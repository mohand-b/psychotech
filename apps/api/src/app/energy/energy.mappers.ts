import {
  EnergyLedgerReason as DbEnergyLedgerReason,
  SubscriptionTier as DbSubscriptionTier,
} from '@prisma/client';
import { EnergyLedgerReason, SubscriptionTier } from '@psychotech/shared';

const SHARED_TIER_BY_DB: Record<DbSubscriptionTier, SubscriptionTier> = {
  FREE: SubscriptionTier.FREE,
  ESSENTIAL: SubscriptionTier.ESSENTIAL,
  UNLIMITED: SubscriptionTier.UNLIMITED,
};

const DB_REASON_BY_SHARED: Record<EnergyLedgerReason, DbEnergyLedgerReason> = {
  [EnergyLedgerReason.DAILY_RESET]: DbEnergyLedgerReason.DAILY_RESET,
  [EnergyLedgerReason.SESSION_SPENT]: DbEnergyLedgerReason.SESSION_SPENT,
  [EnergyLedgerReason.AXIS_SPENT]: DbEnergyLedgerReason.AXIS_SPENT,
  [EnergyLedgerReason.REFUND]: DbEnergyLedgerReason.REFUND,
  [EnergyLedgerReason.ADMIN_GRANT]: DbEnergyLedgerReason.ADMIN_GRANT,
};

export function toSharedTier(tier: DbSubscriptionTier): SubscriptionTier {
  return SHARED_TIER_BY_DB[tier];
}

export function toDbReason(reason: EnergyLedgerReason): DbEnergyLedgerReason {
  return DB_REASON_BY_SHARED[reason];
}
