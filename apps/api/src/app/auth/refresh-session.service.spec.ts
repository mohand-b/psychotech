import { createHash } from 'node:crypto';
import { RefreshSession } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RefreshSessionRepository } from './refresh-session.repository';
import {
  REFRESH_REUSE_GRACE_SECONDS,
  REFRESH_ROTATION_MIN_AGE_SECONDS,
  RefreshSessionService,
} from './refresh-session.service';
import { TokenService } from './token.service';

const REFRESH_TTL_SECONDS = 604_800;
const NOW = new Date('2026-09-19T12:00:00.000Z');
const NOW_SECONDS = NOW.getTime() / 1000;
const SESSION_ID = 'device-session-1';
const USER_ID = 'user-1';
const IDENTITY = { sub: USER_ID, email: 'alice@example.com' };

const hashOf = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

const secondsBefore = (seconds: number): Date =>
  new Date(NOW.getTime() - seconds * 1000);

function buildSession(overrides: Partial<RefreshSession> = {}): RefreshSession {
  return {
    id: SESSION_ID,
    userId: USER_ID,
    tokenHash: hashOf('current-token'),
    previousTokenHash: null,
    createdAt: secondsBefore(REFRESH_ROTATION_MIN_AGE_SECONDS * 2),
    rotatedAt: secondsBefore(REFRESH_ROTATION_MIN_AGE_SECONDS * 2),
    expiresAt: new Date(NOW.getTime() + 1000),
    ...overrides,
  };
}

function payloadIssued(secondsAgo: number) {
  return { ...IDENTITY, sid: SESSION_ID, iat: NOW_SECONDS - secondsAgo };
}

const repository = {
  create: vi.fn(),
  findById: vi.fn(),
  rotate: vi.fn(),
  confirmSuccessor: vi.fn(),
  close: vi.fn(),
  closeAll: vi.fn(),
  deleteExpired: vi.fn(),
};
const tokenService = { signRefreshToken: vi.fn() };

const service = new RefreshSessionService(
  repository as unknown as RefreshSessionRepository,
  tokenService as unknown as TokenService,
  {
    refreshTtlSeconds: REFRESH_TTL_SECONDS,
  } as ConstructorParameters<typeof RefreshSessionService>[2],
);

beforeEach(() => {
  vi.clearAllMocks();
  tokenService.signRefreshToken.mockResolvedValue('successor-token');
});

describe('RefreshSessionService.open', () => {
  it('creates one session per sign-in, bound to the token through its session id', async () => {
    const token = await service.open(IDENTITY, NOW);

    const signed = tokenService.signRefreshToken.mock.calls[0][0];
    expect(signed).toEqual({ ...IDENTITY, sid: expect.any(String) });
    expect(repository.create).toHaveBeenCalledWith({
      id: signed.sid,
      userId: USER_ID,
      tokenHash: hashOf(token),
      expiresAt: new Date(NOW.getTime() + REFRESH_TTL_SECONDS * 1000),
    });
  });

  it('never touches the sessions of the other devices', async () => {
    await service.open(IDENTITY, NOW);

    expect(repository.closeAll).not.toHaveBeenCalled();
    expect(repository.close).not.toHaveBeenCalled();
    expect(repository.deleteExpired).toHaveBeenCalledWith(USER_ID, NOW);
  });
});

describe('RefreshSessionService.renew', () => {
  it('keeps a young token as is, so concurrent or lost refresh responses cannot strand the client', async () => {
    repository.findById.mockResolvedValue(buildSession());

    const renewed = await service.renew(
      payloadIssued(REFRESH_ROTATION_MIN_AGE_SECONDS - 1),
      'current-token',
      NOW,
    );

    expect(renewed).toBe('current-token');
    expect(repository.rotate).not.toHaveBeenCalled();
    expect(tokenService.signRefreshToken).not.toHaveBeenCalled();
  });

  it('rotates a token older than the rotation age and remembers it as the previous one', async () => {
    repository.findById.mockResolvedValue(buildSession());

    const renewed = await service.renew(
      payloadIssued(REFRESH_ROTATION_MIN_AGE_SECONDS),
      'current-token',
      NOW,
    );

    expect(renewed).toBe('successor-token');
    expect(tokenService.signRefreshToken).toHaveBeenCalledWith({
      ...IDENTITY,
      sid: SESSION_ID,
    });
    expect(repository.rotate).toHaveBeenCalledWith(SESSION_ID, {
      tokenHash: hashOf('successor-token'),
      previousTokenHash: hashOf('current-token'),
      rotatedAt: NOW,
      expiresAt: new Date(NOW.getTime() + REFRESH_TTL_SECONDS * 1000),
    });
  });

  it('accepts the previous token right after a rotation without rotating again (second tab)', async () => {
    repository.findById.mockResolvedValue(
      buildSession({
        tokenHash: hashOf('successor-token'),
        previousTokenHash: hashOf('current-token'),
        rotatedAt: secondsBefore(REFRESH_REUSE_GRACE_SECONDS - 1),
      }),
    );

    const renewed = await service.renew(
      payloadIssued(REFRESH_ROTATION_MIN_AGE_SECONDS + 10),
      'current-token',
      NOW,
    );

    expect(renewed).toBe('current-token');
    expect(repository.rotate).not.toHaveBeenCalled();
  });

  it('issues a new successor when the previous token comes back after the grace period (rotation response lost)', async () => {
    repository.findById.mockResolvedValue(
      buildSession({
        tokenHash: hashOf('never-received-token'),
        previousTokenHash: hashOf('current-token'),
        rotatedAt: secondsBefore(REFRESH_REUSE_GRACE_SECONDS),
      }),
    );

    const renewed = await service.renew(
      payloadIssued(REFRESH_ROTATION_MIN_AGE_SECONDS * 2),
      'current-token',
      NOW,
    );

    expect(renewed).toBe('successor-token');
    expect(repository.rotate).toHaveBeenCalledWith(
      SESSION_ID,
      expect.objectContaining({
        tokenHash: hashOf('successor-token'),
        previousTokenHash: hashOf('current-token'),
      }),
    );
  });

  it('retires the previous token once its successor is presented', async () => {
    repository.findById.mockResolvedValue(
      buildSession({ previousTokenHash: hashOf('older-token') }),
    );

    await service.renew(payloadIssued(60), 'current-token', NOW);

    expect(repository.confirmSuccessor).toHaveBeenCalledWith(SESSION_ID);
  });

  it.each([
    ['an unknown session', null],
    ['a token that is neither current nor previous', buildSession()],
    ['a session owned by another user', buildSession({ userId: 'user-2' })],
    ['an expired session', buildSession({ expiresAt: NOW })],
  ])('rejects %s', async (_label, stored) => {
    repository.findById.mockResolvedValue(stored);
    const presented = stored?.userId === USER_ID && stored.expiresAt > NOW
      ? 'forged-token'
      : 'current-token';

    const renewed = await service.renew(payloadIssued(60), presented, NOW);

    expect(renewed).toBeNull();
    expect(repository.rotate).not.toHaveBeenCalled();
  });
});

describe('RefreshSessionService.close', () => {
  it('closes a single device session, scoped to its owner', async () => {
    await service.close(SESSION_ID, USER_ID);

    expect(repository.close).toHaveBeenCalledWith(SESSION_ID, USER_ID);
    expect(repository.closeAll).not.toHaveBeenCalled();
  });

  it('closes every device session on demand', async () => {
    await service.closeAll(USER_ID);

    expect(repository.closeAll).toHaveBeenCalledWith(USER_ID);
  });
});
