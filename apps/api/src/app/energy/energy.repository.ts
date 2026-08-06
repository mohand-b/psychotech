import { Injectable } from '@nestjs/common';
import {
  EnergyLedgerReason,
  EnergyWallet,
  Prisma,
  
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { refilledBalance } from './energy.logic';

export interface EnergyContext {
  wallet: EnergyWallet;
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

  creditToCapacity(
    userId: string,
    reason: EnergyLedgerReason,
    ref?: string,
  ): Promise<EnergyWallet> {
    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.energyWallet.findUniqueOrThrow({
        where: { userId },
      });
      if (wallet.balance >= wallet.capacity) {
        return wallet;
      }
      const updated = await tx.energyWallet.update({
        where: { userId },
        data: { balance: wallet.capacity },
      });
      await tx.energyLedger.create({
        data: {
          userId,
          delta: wallet.capacity - wallet.balance,
          reason,
          balanceAfter: wallet.capacity,
          ref: ref ?? null,
        },
      });
      return updated;
    });
  }

  private async queryContext(
    client: PrismaClientLike,
    userId: string,
  ): Promise<EnergyContext | null> {
    const user = await client.user.findUnique({
      where: { id: userId },
      include: { energyWallet: true },
    });
    if (!user) {
      return null;
    }
    const wallet =
      user.energyWallet ??
      (await client.energyWallet.create({ data: { userId } }));
    return {
      wallet,
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
    const balance = refilledBalance(previousBalance, capacity);
    const wallet = await client.energyWallet.update({
      where: { userId },
      data: { balance, lastResetAt: resetAt },
    });
    if (balance > previousBalance) {
      await client.energyLedger.create({
        data: {
          userId,
          delta: balance - previousBalance,
          reason: EnergyLedgerReason.DAILY_RESET,
          balanceAfter: balance,
        },
      });
    }
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
