import { Injectable } from '@nestjs/common';
import {
  EnergyLedgerReason,
  EnergyWallet,
  Prisma,
  Subscription,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface EnergyContext {
  wallet: EnergyWallet;
  subscription: Subscription | null;
  timezone: string;
}

type PrismaClientLike = Prisma.TransactionClient;

@Injectable()
export class EnergyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findEnergyContext(userId: string): Promise<EnergyContext | null> {
    return this.queryContext(this.prisma, userId);
  }

  findEnergyContextWithin(
    client: PrismaClientLike,
    userId: string,
  ): Promise<EnergyContext | null> {
    return this.queryContext(client, userId);
  }

  applyDailyReset(
    userId: string,
    capacity: number,
    resetAt: Date,
    previousBalance: number,
  ): Promise<EnergyWallet> {
    return this.prisma.$transaction((tx) =>
      this.resetWithin(tx, userId, capacity, resetAt, previousBalance),
    );
  }

  resetWithin(
    client: PrismaClientLike,
    userId: string,
    capacity: number,
    resetAt: Date,
    previousBalance: number,
  ): Promise<EnergyWallet> {
    return this.debitReset(client, userId, capacity, resetAt, previousBalance);
  }

  spend(
    userId: string,
    cost: number,
    reason: EnergyLedgerReason,
    sessionId?: string,
  ): Promise<EnergyWallet> {
    return this.prisma.$transaction((tx) =>
      this.spendWithin(tx, userId, cost, reason, sessionId),
    );
  }

  spendWithin(
    client: PrismaClientLike,
    userId: string,
    cost: number,
    reason: EnergyLedgerReason,
    sessionId?: string,
  ): Promise<EnergyWallet> {
    return this.applySpend(client, userId, cost, reason, sessionId);
  }

  private async queryContext(
    client: PrismaClientLike,
    userId: string,
  ): Promise<EnergyContext | null> {
    const user = await client.user.findUnique({
      where: { id: userId },
      include: { energyWallet: true, subscription: true },
    });
    if (!user || !user.energyWallet) {
      return null;
    }
    return {
      wallet: user.energyWallet,
      subscription: user.subscription,
      timezone: user.timezone,
    };
  }

  private async debitReset(
    client: PrismaClientLike,
    userId: string,
    capacity: number,
    resetAt: Date,
    previousBalance: number,
  ): Promise<EnergyWallet> {
    const wallet = await client.energyWallet.update({
      where: { userId },
      data: { balance: capacity, lastResetAt: resetAt },
    });
    await client.energyLedger.create({
      data: {
        userId,
        delta: capacity - previousBalance,
        reason: EnergyLedgerReason.DAILY_RESET,
        balanceAfter: capacity,
      },
    });
    return wallet;
  }

  private async applySpend(
    client: PrismaClientLike,
    userId: string,
    cost: number,
    reason: EnergyLedgerReason,
    sessionId?: string,
  ): Promise<EnergyWallet> {
    const wallet = await client.energyWallet.update({
      where: { userId },
      data: { balance: { decrement: cost } },
    });
    await client.energyLedger.create({
      data: {
        userId,
        delta: -cost,
        reason,
        balanceAfter: wallet.balance,
        sessionId: sessionId ?? null,
      },
    });
    return wallet;
  }
}
