import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const PAIRING_SESSION_INCLUDE = {
  axisResults: true,
} satisfies Prisma.SessionInclude;

export type PairingSession = Prisma.SessionGetPayload<{
  include: typeof PAIRING_SESSION_INCLUDE;
}>;

@Injectable()
export class GamepadRepository {
  constructor(private readonly prisma: PrismaService) {}

  findUserSession(
    sessionId: string,
    userId: string,
  ): Promise<PairingSession | null> {
    return this.prisma.session.findFirst({
      where: { id: sessionId, userId },
      include: PAIRING_SESSION_INCLUDE,
    });
  }
}
