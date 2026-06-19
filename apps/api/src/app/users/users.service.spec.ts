import { BadRequestException, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { Sector } from '@psychotech/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Martin',
    passwordHash: 'hash',
    refreshTokenHash: null,
    locale: 'fr',
    timezone: 'Europe/Paris',
    currentSector: 'RAILWAY',
    createdAt: new Date('2026-06-13T10:00:00Z'),
    updatedAt: new Date('2026-06-13T10:00:00Z'),
    ...overrides,
  };
}

const repository = {
  findById: vi.fn(),
  updateProfile: vi.fn(),
  isSectorActive: vi.fn(),
};

const service = new UsersService(repository as unknown as UsersRepository);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UsersService.getProfile', () => {
  it('returns the current user profile', async () => {
    repository.findById.mockResolvedValue(buildUser());

    const profile = await service.getProfile('user-1');

    expect(profile).toMatchObject({
      id: 'user-1',
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Martin',
      timezone: 'Europe/Paris',
      currentSector: Sector.RAILWAY,
    });
  });

  it('throws when the user does not exist', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getProfile('user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('UsersService.updateProfile', () => {
  it('updates the editable fields without touching the sector check', async () => {
    repository.updateProfile.mockResolvedValue(
      buildUser({ firstName: 'Bob', timezone: 'America/New_York' }),
    );

    const profile = await service.updateProfile('user-1', {
      firstName: 'Bob',
      timezone: 'America/New_York',
    });

    expect(repository.updateProfile).toHaveBeenCalledWith('user-1', {
      firstName: 'Bob',
      lastName: undefined,
      locale: undefined,
      timezone: 'America/New_York',
      currentSector: undefined,
    });
    expect(repository.isSectorActive).not.toHaveBeenCalled();
    expect(profile.firstName).toBe('Bob');
    expect(profile.timezone).toBe('America/New_York');
  });

  it('accepts a change to an active sector', async () => {
    repository.isSectorActive.mockResolvedValue(true);
    repository.updateProfile.mockResolvedValue(buildUser());

    await service.updateProfile('user-1', { currentSector: Sector.RAILWAY });

    expect(repository.isSectorActive).toHaveBeenCalledWith(Sector.RAILWAY);
    expect(repository.updateProfile).toHaveBeenCalled();
  });

  it('rejects a change to an inactive sector', async () => {
    repository.isSectorActive.mockResolvedValue(false);

    await expect(
      service.updateProfile('user-1', { currentSector: Sector.AVIATION }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.updateProfile).not.toHaveBeenCalled();
  });
});
