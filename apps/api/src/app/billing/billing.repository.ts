import { Injectable } from '@nestjs/common';
import { EnergyLedgerReason, PackPurchase, Prisma, User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  async saveStripeCustomerId(
    userId: string,
    stripeCustomerId: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId },
    });
  }

  async registerEvent(eventId: string): Promise<boolean> {
    try {
      await this.prisma.stripeEvent.create({ data: { id: eventId } });
      return true;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  async creditPackPurchaseOnce(
    eventId: string,
    userId: string,
    packId: string,
    energyAmount: number,
    amountCents: number,
    ref: string,
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.stripeEvent.create({ data: { id: eventId } });
        const wallet = await tx.energyWallet.upsert({
          where: { userId },
          create: { userId, balance: energyAmount },
          update: { balance: { increment: energyAmount } },
        });
        await tx.energyLedger.create({
          data: {
            userId,
            delta: energyAmount,
            reason: EnergyLedgerReason.PURCHASE,
            balanceAfter: wallet.balance,
            ref,
          },
        });
        await tx.packPurchase.create({
          data: {
            userId,
            packId,
            energyAmount,
            amountCents,
            checkoutSessionId: ref,
          },
        });
      });
      return true;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  listPurchases(userId: string): Promise<PackPurchase[]> {
    return this.prisma.packPurchase.findMany({
      where: { userId },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  async saveReceiptUrl(
    checkoutSessionId: string,
    receiptUrl: string,
  ): Promise<void> {
    await this.prisma.packPurchase.updateMany({
      where: { checkoutSessionId, receiptUrl: null },
      data: { receiptUrl },
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    );
  }
}
