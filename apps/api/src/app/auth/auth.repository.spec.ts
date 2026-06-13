import { User } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRepository } from './auth.repository';

function buildUser(): User {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    displayName: 'Alice',
    passwordHash: 'hashed-password',
    refreshTokenHash: null,
    locale: 'fr',
    timezone: 'Europe/Paris',
    currentSector: 'RAILWAY',
    createdAt: new Date('2026-06-13T10:00:00Z'),
    updatedAt: new Date('2026-06-13T10:00:00Z'),
  };
}

describe('AuthRepository.createAccount', () => {
  it('creates the user, the energy wallet and the subscription in one transaction', async () => {
    const tx = { user: { create: vi.fn().mockResolvedValue(buildUser()) } };
    const prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new AuthRepository(prisma as unknown as PrismaService);

    await repository.createAccount({
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
      displayName: 'Alice',
      timezone: 'Europe/Paris',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        email: 'alice@example.com',
        passwordHash: 'hashed-password',
        displayName: 'Alice',
        timezone: 'Europe/Paris',
        locale: undefined,
        energyWallet: { create: { balance: 5, capacity: 5 } },
        subscription: { create: { tier: 'FREE', status: 'ACTIVE' } },
      },
    });
  });
});
