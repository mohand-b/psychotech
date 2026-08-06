import { Injectable } from '@nestjs/common';
import { EmailVerification, EnergyLedgerReason } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type VerificationOutcome =
  | 'VERIFIED_WITH_GRANT'
  | 'VERIFIED_WITHOUT_GRANT'
  | 'ALREADY_USED';

@Injectable()
export class EmailVerificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  replaceToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    now: Date,
  ): Promise<EmailVerification> {
    return this.prisma.emailVerification.upsert({
      where: { userId },
      create: { userId, tokenHash, expiresAt },
      update: {
        tokenHash,
        expiresAt,
        usedAt: null,
        sentCount: { increment: 1 },
        lastSentAt: now,
      },
    });
  }

  findByTokenHash(tokenHash: string): Promise<EmailVerification | null> {
    return this.prisma.emailVerification.findFirst({ where: { tokenHash } });
  }

  findByUserId(userId: string): Promise<EmailVerification | null> {
    return this.prisma.emailVerification.findUnique({ where: { userId } });
  }

  async consumeAndGrant(
    verificationId: string,
    userId: string,
    grantAmount: number,
    now: Date,
  ): Promise<VerificationOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.emailVerification.updateMany({
        where: { id: verificationId, usedAt: null },
        data: { usedAt: now },
      });
      if (consumed.count === 0) {
        return 'ALREADY_USED';
      }
      const marked = await tx.user.updateMany({
        where: { id: userId, emailVerifiedAt: null },
        data: { emailVerifiedAt: now },
      });
      if (marked.count === 0) {
        return 'VERIFIED_WITHOUT_GRANT';
      }
      const wallet = await tx.energyWallet.upsert({
        where: { userId },
        create: { userId, balance: grantAmount },
        update: { balance: { increment: grantAmount } },
      });
      await tx.energyLedger.create({
        data: {
          userId,
          delta: grantAmount,
          reason: EnergyLedgerReason.SIGNUP_GRANT,
          balanceAfter: wallet.balance,
          ref: verificationId,
        },
      });
      return 'VERIFIED_WITH_GRANT';
    });
  }
}
