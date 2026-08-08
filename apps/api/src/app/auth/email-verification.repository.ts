import { Injectable } from '@nestjs/common';
import { EmailVerification, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type VerificationOutcome =
  | 'VERIFIED'
  | 'ALREADY_VERIFIED'
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

  async consumeAndVerify(
    verificationId: string,
    userId: string,
    now: Date,
    onVerified?: (client: Prisma.TransactionClient) => Promise<void>,
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
        return 'ALREADY_VERIFIED';
      }
      if (onVerified) {
        await onVerified(tx);
      }
      return 'VERIFIED';
    });
  }
}
