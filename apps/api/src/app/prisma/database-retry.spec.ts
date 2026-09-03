import { Prisma } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { isTransientDatabaseError, withDatabaseRetry } from './database-retry';

function initializationError(): Prisma.PrismaClientInitializationError {
  return new Prisma.PrismaClientInitializationError(
    "Can't reach database server",
    '6.19.3',
    'P1001',
  );
}

function knownRequestError(code: string): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError(code, {
    code,
    clientVersion: '6.19.3',
  });
}

describe('isTransientDatabaseError', () => {
  it('flags connection initialization failures', () => {
    expect(isTransientDatabaseError(initializationError())).toBe(true);
  });

  it('flags the transient known request codes', () => {
    for (const code of ['P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2028']) {
      expect(isTransientDatabaseError(knownRequestError(code))).toBe(true);
    }
  });

  it('does not flag business errors such as a unique violation', () => {
    expect(isTransientDatabaseError(knownRequestError('P2002'))).toBe(false);
    expect(isTransientDatabaseError(new Error('boom'))).toBe(false);
  });
});

describe('withDatabaseRetry', () => {
  const noWait = { baseDelayMs: 0, maxDelayMs: 0 };

  it('returns the result without retrying when the operation succeeds', async () => {
    const operation = vi.fn().mockResolvedValue('ok');
    await expect(withDatabaseRetry(operation, noWait)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries a transient error and succeeds on a later attempt', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(initializationError())
      .mockRejectedValueOnce(knownRequestError('P2028'))
      .mockResolvedValue('recovered');
    await expect(withDatabaseRetry(operation, noWait)).resolves.toBe(
      'recovered',
    );
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('rethrows a non-transient error immediately without retrying', async () => {
    const businessError = knownRequestError('P2002');
    const operation = vi.fn().mockRejectedValue(businessError);
    await expect(withDatabaseRetry(operation, noWait)).rejects.toBe(
      businessError,
    );
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('gives up after the configured number of attempts', async () => {
    const operation = vi.fn().mockRejectedValue(initializationError());
    await expect(
      withDatabaseRetry(operation, { ...noWait, maxAttempts: 3 }),
    ).rejects.toBeInstanceOf(Prisma.PrismaClientInitializationError);
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
