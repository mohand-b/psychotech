import { Injectable } from '@nestjs/common';
import { PasswordReset } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type PasswordResetOutcome = 'RESET' | 'ALREADY_USED';

@Injectable()
export class PasswordResetRepository {
  constructor(private readonly prisma: PrismaService) {}

  replaceRequest(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    now: Date,
  ): Promise<PasswordReset> {
    return this.prisma.passwordReset.upsert({
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

  findByUserId(userId: string): Promise<PasswordReset | null> {
    return this.prisma.passwordReset.findUnique({ where: { userId } });
  }

  findByTokenHash(tokenHash: string): Promise<PasswordReset | null> {
    return this.prisma.passwordReset.findFirst({ where: { tokenHash } });
  }

  async discardForUser(userId: string): Promise<void> {
    await this.prisma.passwordReset.deleteMany({ where: { userId } });
  }

  consumeAndSetPassword(
    requestId: string,
    userId: string,
    passwordHash: string,
    now: Date,
  ): Promise<PasswordResetOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordReset.updateMany({
        where: { id: requestId, usedAt: null },
        data: { usedAt: now },
      });
      if (consumed.count === 0) {
        return 'ALREADY_USED';
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          passwordChangedAt: now,
          refreshTokenHash: null,
        },
      });
      return 'RESET';
    });
  }
}
