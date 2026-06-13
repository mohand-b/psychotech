import { Injectable } from '@nestjs/common';
import {
  EnergyLedgerReason,
  EnergyWallet,
  SubscriptionTier,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EnergyContext {
  wallet: EnergyWallet;
  tier: SubscriptionTier;
  timezone: string;
}

@Injectable()
export class EnergyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEnergyContext(userId: string): Promise<EnergyContext | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { energyWallet: true, subscription: true },
    });
    if (!user || !user.energyWallet) {
      return null;
    }
    return {
      wallet: user.energyWallet,
      tier: user.subscription?.tier ?? SubscriptionTier.FREE,
      timezone: user.timezone,
    };
  }

  async applyDailyReset(
    userId: string,
    capacity: number,
    resetAt: Date,
    previousBalance: number,
  ): Promise<EnergyWallet> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.energyWallet.update({
        where: { userId },
        data: { balance: capacity, lastResetAt: resetAt },
      });
      await tx.energyLedger.create({
        data: {
          userId,
          delta: capacity - previousBalance,
          reason: EnergyLedgerReason.DAILY_RESET,
          balanceAfter: capacity,
        },
      });
      return wallet;
    });
  }

  async spend(
    userId: string,
    cost: number,
    reason: EnergyLedgerReason,
    sessionId?: string,
  ): Promise<EnergyWallet> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.energyWallet.update({
        where: { userId },
        data: { balance: { decrement: cost } },
      });
      await tx.energyLedger.create({
        data: {
          userId,
          delta: -cost,
          reason,
          balanceAfter: wallet.balance,
          sessionId: sessionId ?? null,
        },
      });
      return wallet;
    });
  }
}
