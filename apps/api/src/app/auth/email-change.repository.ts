import { Injectable } from '@nestjs/common';
import { EmailChange, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type EmailSwapOutcome = 'CHANGED' | 'ALREADY_USED' | 'EMAIL_TAKEN';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class EmailChangeRepository {
  constructor(private readonly prisma: PrismaService) {}

  replaceRequest(
    userId: string,
    newEmail: string,
    tokenHash: string,
    expiresAt: Date,
    now: Date,
  ): Promise<EmailChange> {
    return this.prisma.emailChange.upsert({
      where: { userId },
      create: { userId, newEmail, tokenHash, expiresAt },
      update: {
        newEmail,
        tokenHash,
        expiresAt,
        usedAt: null,
        sentCount: { increment: 1 },
        lastSentAt: now,
      },
    });
  }

  findByUserId(userId: string): Promise<EmailChange | null> {
    return this.prisma.emailChange.findUnique({ where: { userId } });
  }

  findByTokenHash(tokenHash: string): Promise<EmailChange | null> {
    return this.prisma.emailChange.findFirst({ where: { tokenHash } });
  }

  async consumeAndSwap(
    requestId: string,
    userId: string,
    newEmail: string,
    now: Date,
  ): Promise<EmailSwapOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const consumed = await tx.emailChange.updateMany({
          where: { id: requestId, usedAt: null },
          data: { usedAt: now },
        });
        if (consumed.count === 0) {
          return 'ALREADY_USED';
        }
        await tx.user.update({
          where: { id: userId },
          data: {
            email: newEmail,
            emailVerifiedAt: now,
            pendingEmail: null,
          },
        });
        return 'CHANGED';
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === UNIQUE_CONSTRAINT_VIOLATION
      ) {
        return 'EMAIL_TAKEN';
      }
      throw error;
    }
  }
}
