import { Injectable } from '@nestjs/common';
import {
  EnergyLedgerReason,
  PackPurchase,
  PaymentProvider,
  Prisma,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

export interface GooglePlayPackPurchaseCredit {
  userId: string;
  packId: string;
  energyAmount: number;
  amountCents: number;
  purchaseToken: string;
}

interface PackPurchaseCredit {
  userId: string;
  packId: string;
  energyAmount: number;
  amountCents: number;
  provider: PaymentProvider;
  paymentRef: string;
}

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

  creditPackPurchaseOnce(
    eventId: string,
    userId: string,
    packId: string,
    energyAmount: number,
    amountCents: number,
    ref: string,
  ): Promise<boolean> {
    return this.creditOnce(async (tx) => {
      await tx.stripeEvent.create({ data: { id: eventId } });
      await this.writePackPurchaseCredit(tx, {
        userId,
        packId,
        energyAmount,
        amountCents,
        provider: PaymentProvider.STRIPE,
        paymentRef: ref,
      });
    });
  }

  creditGooglePlayPurchaseOnce(
    purchase: GooglePlayPackPurchaseCredit,
  ): Promise<boolean> {
    return this.creditOnce((tx) =>
      this.writePackPurchaseCredit(tx, {
        userId: purchase.userId,
        packId: purchase.packId,
        energyAmount: purchase.energyAmount,
        amountCents: purchase.amountCents,
        provider: PaymentProvider.GOOGLE_PLAY,
        paymentRef: purchase.purchaseToken,
      }),
    );
  }

  async findPurchaseOwnerId(paymentRef: string): Promise<string | null> {
    const purchase = await this.prisma.packPurchase.findUnique({
      where: { paymentRef },
      select: { userId: true },
    });
    return purchase?.userId ?? null;
  }

  revokeGooglePlayPurchaseOnce(
    purchaseToken: string,
    revokedAt: Date,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const purchase = await tx.packPurchase.findUnique({
        where: { paymentRef: purchaseToken },
      });
      if (
        !purchase ||
        purchase.provider !== PaymentProvider.GOOGLE_PLAY ||
        purchase.revokedAt !== null
      ) {
        return false;
      }
      const claimed = await tx.packPurchase.updateMany({
        where: { id: purchase.id, revokedAt: null },
        data: { revokedAt },
      });
      if (claimed.count === 0) {
        return false;
      }
      const wallet = await tx.energyWallet.findUnique({
        where: { userId: purchase.userId },
      });
      const withdrawn = Math.min(wallet?.balance ?? 0, purchase.energyAmount);
      const updatedWallet = await tx.energyWallet.upsert({
        where: { userId: purchase.userId },
        create: { userId: purchase.userId, balance: 0 },
        update: { balance: { decrement: withdrawn } },
      });
      await tx.energyLedger.create({
        data: {
          userId: purchase.userId,
          delta: -withdrawn,
          reason: EnergyLedgerReason.PURCHASE_REVOKED,
          balanceAfter: updatedWallet.balance,
          ref: purchaseToken,
        },
      });
      return true;
    });
  }

  listPurchases(userId: string): Promise<PackPurchase[]> {
    return this.prisma.packPurchase.findMany({
      where: { userId, revokedAt: null },
      orderBy: { purchasedAt: 'desc' },
    });
  }

  async saveReceiptUrl(paymentRef: string, receiptUrl: string): Promise<void> {
    await this.prisma.packPurchase.updateMany({
      where: { paymentRef, receiptUrl: null },
      data: { receiptUrl },
    });
  }

  private async creditOnce(
    write: (tx: Prisma.TransactionClient) => Promise<void>,
  ): Promise<boolean> {
    try {
      await this.prisma.$transaction(write);
      return true;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        return false;
      }
      throw error;
    }
  }

  private async writePackPurchaseCredit(
    tx: Prisma.TransactionClient,
    purchase: PackPurchaseCredit,
  ): Promise<void> {
    const wallet = await tx.energyWallet.upsert({
      where: { userId: purchase.userId },
      create: { userId: purchase.userId, balance: purchase.energyAmount },
      update: { balance: { increment: purchase.energyAmount } },
    });
    await tx.energyLedger.create({
      data: {
        userId: purchase.userId,
        delta: purchase.energyAmount,
        reason: EnergyLedgerReason.PURCHASE,
        balanceAfter: wallet.balance,
        ref: purchase.paymentRef,
      },
    });
    await tx.packPurchase.create({
      data: {
        userId: purchase.userId,
        packId: purchase.packId,
        energyAmount: purchase.energyAmount,
        amountCents: purchase.amountCents,
        provider: purchase.provider,
        paymentRef: purchase.paymentRef,
      },
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === UNIQUE_CONSTRAINT_VIOLATION
    );
  }
}
