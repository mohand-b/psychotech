import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CsrfGuard } from './csrf.guard';

interface CsrfRequestStub {
  method: string;
  cookies: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
}

function buildContext(request: CsrfRequestStub): ExecutionContext {
  const httpRequest = {
    method: request.method,
    cookies: request.cookies,
    header: (name: string) => request.headers[name.toLowerCase()],
  };
  return {
    switchToHttp: () => ({ getRequest: () => httpRequest }),
    getHandler: () => () => undefined,
    getClass: () => class {},
  } as unknown as ExecutionContext;
}

const reflector = { getAllAndOverride: vi.fn() };
const guard = new CsrfGuard(reflector as unknown as Reflector);

beforeEach(() => {
  vi.clearAllMocks();
  reflector.getAllAndOverride.mockReturnValue(false);
});

describe('CsrfGuard', () => {
  it('allows safe methods without a token', () => {
    expect(
      guard.canActivate(buildContext({ method: 'GET', cookies: {}, headers: {} })),
    ).toBe(true);
  });

  it('allows routes that opt out of csrf', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    expect(
      guard.canActivate(buildContext({ method: 'POST', cookies: {}, headers: {} })),
    ).toBe(true);
  });

  it('allows a mutating request when the cookie matches the header', () => {
    expect(
      guard.canActivate(
        buildContext({
          method: 'POST',
          cookies: { 'XSRF-TOKEN': 'token-value' },
          headers: { 'x-xsrf-token': 'token-value' },
        }),
      ),
    ).toBe(true);
  });

  it('rejects a mutating request when the header is missing or mismatched', () => {
    expect(() =>
      guard.canActivate(
        buildContext({
          method: 'POST',
          cookies: { 'XSRF-TOKEN': 'token-value' },
          headers: {},
        }),
      ),
    ).toThrow(ForbiddenException);
    expect(() =>
      guard.canActivate(
        buildContext({
          method: 'POST',
          cookies: { 'XSRF-TOKEN': 'token-value' },
          headers: { 'x-xsrf-token': 'other-value' },
        }),
      ),
    ).toThrow(ForbiddenException);
  });
});
