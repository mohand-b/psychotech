import { Injectable } from '@nestjs/common';
import { EnergyLedgerReason, EnergyWallet, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type PrismaClientLike = Prisma.TransactionClient;

@Injectable()
export class EnergyRepository {
  constructor(private readonly prisma: PrismaService) {}

  findWallet(userId: string): Promise<EnergyWallet | null> {
    return this.queryWallet(this.prisma, userId);
  }

  findWalletWithin(
    client: PrismaClientLike,
    userId: string,
  ): Promise<EnergyWallet | null> {
    return this.queryWallet(client, userId);
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

  async spendWithin(
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

  async hasLedgerRef(userId: string, ref: string): Promise<boolean> {
    const entry = await this.prisma.energyLedger.findFirst({
      where: { userId, ref },
      select: { id: true },
    });
    return entry !== null;
  }

  private async queryWallet(
    client: PrismaClientLike,
    userId: string,
  ): Promise<EnergyWallet | null> {
    const user = await client.user.findUnique({
      where: { id: userId },
      include: { energyWallet: true },
    });
    if (!user) {
      return null;
    }
    return (
      user.energyWallet ??
      (await client.energyWallet.create({ data: { userId } }))
    );
  }
}
