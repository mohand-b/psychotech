import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TokenService } from '../token.service';
import { JwtAuthGuard } from './jwt-auth.guard';

interface GuardRequest {
  cookies: Record<string, string | undefined>;
  user?: { id: string; email: string };
}

function buildContext(request: GuardRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

const reflector = { getAllAndOverride: vi.fn() };
const tokenService = { verifyAccessToken: vi.fn() };
const guard = new JwtAuthGuard(
  reflector as unknown as Reflector,
  tokenService as unknown as TokenService,
);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('JwtAuthGuard', () => {
  it('rejects a protected route without an access cookie', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);

    await expect(
      guard.canActivate(buildContext({ cookies: {} })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('authenticates a protected route with a valid access cookie', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockResolvedValue({
      sub: 'user-1',
      email: 'alice@example.com',
    });
    const request: GuardRequest = { cookies: { access_token: 'valid-token' } };

    await expect(guard.canActivate(buildContext(request))).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'user-1', email: 'alice@example.com' });
  });

  it('rejects an invalid access cookie', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    tokenService.verifyAccessToken.mockRejectedValue(new Error('expired'));

    await expect(
      guard.canActivate(buildContext({ cookies: { access_token: 'broken' } })),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('lets public routes through without a token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);

    await expect(
      guard.canActivate(buildContext({ cookies: {} })),
    ).resolves.toBe(true);
    expect(tokenService.verifyAccessToken).not.toHaveBeenCalled();
  });
});
