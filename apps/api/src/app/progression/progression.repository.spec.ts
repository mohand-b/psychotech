import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressionRepository } from './progression.repository';

describe('ProgressionRepository.countCompletedSessions', () => {
  it('counts only completed full and targeted sessions, excluding tutorials', async () => {
    const prisma = { session: { count: vi.fn().mockResolvedValue(4) } };
    const repository = new ProgressionRepository(prisma as unknown as PrismaService);

    const total = await repository.countCompletedSessions('user-1');

    expect(prisma.session.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', status: 'COMPLETED', mode: { in: ['FULL', 'TARGETED'] } },
    });
    expect(total).toBe(4);
  });
});
