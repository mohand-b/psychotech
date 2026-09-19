import { Injectable } from '@nestjs/common';
import { RefreshSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

interface OpenRefreshSessionParams {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

interface RotateRefreshSessionParams {
  tokenHash: string;
  previousTokenHash: string;
  rotatedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class RefreshSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(params: OpenRefreshSessionParams): Promise<RefreshSession> {
    return this.prisma.refreshSession.create({ data: params });
  }

  findById(id: string): Promise<RefreshSession | null> {
    return this.prisma.refreshSession.findUnique({ where: { id } });
  }

  rotate(
    id: string,
    params: RotateRefreshSessionParams,
  ): Promise<RefreshSession> {
    return this.prisma.refreshSession.update({ where: { id }, data: params });
  }

  confirmSuccessor(id: string): Promise<RefreshSession> {
    return this.prisma.refreshSession.update({
      where: { id },
      data: { previousTokenHash: null },
    });
  }

  async close(id: string, userId: string): Promise<void> {
    await this.prisma.refreshSession.deleteMany({ where: { id, userId } });
  }

  async closeAll(userId: string): Promise<void> {
    await this.prisma.refreshSession.deleteMany({ where: { userId } });
  }

  async deleteExpired(userId: string, now: Date): Promise<void> {
    await this.prisma.refreshSession.deleteMany({
      where: { userId, expiresAt: { lt: now } },
    });
  }
}
