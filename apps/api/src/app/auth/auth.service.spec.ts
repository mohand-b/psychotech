import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { User } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { PasswordHasher } from './password.service';
import { TokenService } from './token.service';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    displayName: 'Alice',
    passwordHash: 'stored-password-hash',
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
  findByEmail: vi.fn(),
  findById: vi.fn(),
  createAccount: vi.fn(),
  updateRefreshTokenHash: vi.fn(),
};

const passwordHasher = { hash: vi.fn(), verify: vi.fn() };
const tokenService = {
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
};

const service = new AuthService(
  repository as unknown as AuthRepository,
  passwordHasher as unknown as PasswordHasher,
  tokenService as unknown as TokenService,
);

beforeEach(() => {
  vi.clearAllMocks();
  tokenService.signAccessToken.mockResolvedValue('access-token');
  tokenService.signRefreshToken.mockResolvedValue('refresh-token');
  repository.updateRefreshTokenHash.mockResolvedValue(buildUser());
});

describe('AuthService.register', () => {
  it('creates the account with a hashed password and stores the hashed refresh token', async () => {
    repository.findByEmail.mockResolvedValue(null);
    passwordHasher.hash
      .mockResolvedValueOnce('hashed-password')
      .mockResolvedValueOnce('hashed-refresh-token');
    repository.createAccount.mockResolvedValue(buildUser());

    const result = await service.register({
      email: 'alice@example.com',
      password: 'super-secret',
      displayName: 'Alice',
    });

    expect(repository.createAccount).toHaveBeenCalledWith({
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
      displayName: 'Alice',
      timezone: 'Europe/Paris',
      locale: undefined,
    });
    expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
      'user-1',
      'hashed-refresh-token',
    );
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(result.user.email).toBe('alice@example.com');
    expect(result.csrfToken).toHaveLength(64);
  });

  it('rejects a duplicate email', async () => {
    repository.findByEmail.mockResolvedValue(buildUser());

    await expect(
      service.register({
        email: 'alice@example.com',
        password: 'super-secret',
        displayName: 'Alice',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(repository.createAccount).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  it('rejects an invalid password', async () => {
    repository.findByEmail.mockResolvedValue(buildUser());
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.login({ email: 'alice@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokenService.signAccessToken).not.toHaveBeenCalled();
  });

  it('issues a session for valid credentials', async () => {
    repository.findByEmail.mockResolvedValue(buildUser());
    passwordHasher.verify.mockResolvedValue(true);
    passwordHasher.hash.mockResolvedValue('hashed-refresh-token');

    const result = await service.login({
      email: 'alice@example.com',
      password: 'super-secret',
    });

    expect(result.tokens.accessToken).toBe('access-token');
    expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
      'user-1',
      'hashed-refresh-token',
    );
  });
});

describe('AuthService.refresh', () => {
  it('rotates the tokens and overwrites the stored refresh hash', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      email: 'alice@example.com',
    });
    repository.findById.mockResolvedValue(
      buildUser({ refreshTokenHash: 'previous-refresh-hash' }),
    );
    passwordHasher.verify.mockResolvedValue(true);
    tokenService.signRefreshToken.mockResolvedValue('rotated-refresh-token');
    passwordHasher.hash.mockResolvedValue('rotated-refresh-hash');

    const result = await service.refresh('presented-refresh-token');

    expect(passwordHasher.verify).toHaveBeenCalledWith(
      'previous-refresh-hash',
      'presented-refresh-token',
    );
    expect(repository.updateRefreshTokenHash).toHaveBeenCalledWith(
      'user-1',
      'rotated-refresh-hash',
    );
    expect(result.tokens.refreshToken).toBe('rotated-refresh-token');
  });

  it('rejects a refresh token that no longer matches the stored hash', async () => {
    tokenService.verifyRefreshToken.mockResolvedValue({
      sub: 'user-1',
      email: 'alice@example.com',
    });
    repository.findById.mockResolvedValue(
      buildUser({ refreshTokenHash: 'rotated-refresh-hash' }),
    );
    passwordHasher.verify.mockResolvedValue(false);

    await expect(service.refresh('old-refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(repository.updateRefreshTokenHash).not.toHaveBeenCalled();
  });

  it('rejects a missing refresh token', async () => {
    await expect(service.refresh(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
