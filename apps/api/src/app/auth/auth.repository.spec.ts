import { EnergyLedgerReason, Prisma, User } from '@prisma/client';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { AuthRepository, GoogleSignInData } from './auth.repository';

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Martin',
    passwordHash: 'hashed-password',
    refreshTokenHash: null,
    locale: 'fr',
    timezone: 'Europe/Paris',
    currentSector: 'RAILWAY',
    stripeCustomerId: null,
    termsVersion: null,
    termsAcceptedAt: null,
    emailVerifiedAt: null,
    createdAt: new Date('2026-06-13T10:00:00Z'),
    updatedAt: new Date('2026-06-13T10:00:00Z'),
    ...overrides,
  } as User;
}

describe('AuthRepository.createAccount', () => {
  it('creates the user with three offered credits and their ledger entry in one transaction', async () => {
    const tx = {
      user: { create: vi.fn().mockResolvedValue(buildUser()) },
      energyLedger: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new AuthRepository(prisma as unknown as PrismaService);

    await repository.createAccount({
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Alice',
      lastName: 'Martin',
      timezone: 'Europe/Paris',
      currentSector: 'RAILWAY',
    });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalledWith({
      data: {
        email: 'alice@example.com',
        passwordHash: 'hashed-password',
        firstName: 'Alice',
        lastName: 'Martin',
        timezone: 'Europe/Paris',
        locale: undefined,
        currentSector: 'RAILWAY',
        energyWallet: { create: { balance: 3 } },
      },
    });
    expect(tx.energyLedger.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        delta: 3,
        reason: EnergyLedgerReason.SIGNUP_GRANT,
        balanceAfter: 3,
        ref: 'user-1',
      },
    });
  });

  it('leaves the account creation more than the default five seconds so a cold database does not abort it', async () => {
    const tx = {
      user: { create: vi.fn().mockResolvedValue(buildUser()) },
      energyLedger: { create: vi.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    };
    const repository = new AuthRepository(prisma as unknown as PrismaService);

    await repository.createAccount({
      email: 'alice@example.com',
      passwordHash: 'hashed-password',
      firstName: 'Alice',
      lastName: 'Martin',
      timezone: 'Europe/Paris',
      currentSector: 'RAILWAY',
    });

    const options = prisma.$transaction.mock.calls[0][1];
    expect(options.timeout).toBeGreaterThan(5000);
    expect(options.maxWait).toBeGreaterThan(0);
  });
});

interface GoogleTx {
  user: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  userIdentity: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  energyLedger: { create: ReturnType<typeof vi.fn> };
}

function buildGoogleTx(): GoogleTx {
  return {
    user: {
      create: vi.fn().mockResolvedValue(buildUser()),
      findFirst: vi.fn().mockResolvedValue(null),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    userIdentity: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    energyLedger: { create: vi.fn().mockResolvedValue({}) },
  };
}

function buildGoogleData(
  overrides: Partial<GoogleSignInData> = {},
): GoogleSignInData {
  return {
    providerAccountId: 'google-sub-1',
    email: 'alice@example.com',
    emailVerified: true,
    firstName: 'Alice',
    lastName: 'Martin',
    timezone: 'Europe/Paris',
    currentSector: 'RAILWAY' as GoogleSignInData['currentSector'],
    termsVersion: '2026-06',
    termsAcceptedAt: new Date('2026-08-21T10:00:00Z'),
    now: new Date('2026-08-21T10:00:00Z'),
    ...overrides,
  };
}

function repositoryWith(tx: GoogleTx): AuthRepository {
  const prisma = {
    $transaction: vi.fn((callback: (client: GoogleTx) => unknown) =>
      callback(tx),
    ),
  };
  return new AuthRepository(prisma as unknown as PrismaService);
}

describe('AuthRepository.updatePasswordHash', () => {
  it('discards any pending reset request so an old link cannot be replayed', async () => {
    const tx = {
      passwordReset: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
      user: { update: vi.fn().mockResolvedValue(buildUser()) },
    };
    const prisma = {
      $transaction: vi.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    const repository = new AuthRepository(prisma as unknown as PrismaService);

    await repository.updatePasswordHash('user-1', 'new-hash');

    expect(tx.passwordReset.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'new-hash', passwordChangedAt: expect.any(Date) },
    });
  });
});

describe('AuthRepository.googleSignIn', () => {
  it('creates a verified Google-only account with a single signup grant and the badge event in the same transaction', async () => {
    const tx = buildGoogleTx();
    const onVerified = vi.fn().mockResolvedValue(undefined);

    const outcome = await repositoryWith(tx).googleSignIn(
      buildGoogleData(),
      onVerified,
    );

    expect(outcome.kind).toBe('CREATED');
    expect(tx.user.create).toHaveBeenCalledTimes(1);
    const createData = tx.user.create.mock.calls[0][0].data;
    expect(createData.emailVerifiedAt).toEqual(new Date('2026-08-21T10:00:00Z'));
    expect(createData.identities).toEqual({
      create: { provider: 'GOOGLE', providerAccountId: 'google-sub-1' },
    });
    expect(createData.energyWallet).toEqual({ create: { balance: 3 } });
    expect(tx.energyLedger.create).toHaveBeenCalledTimes(1);
    expect(tx.energyLedger.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        delta: 3,
        reason: EnergyLedgerReason.SIGNUP_GRANT,
      }),
    });
    expect(onVerified).toHaveBeenCalledWith(tx, 'user-1');
  });

  it('creates an unverified account without the badge event when Google does not vouch for the email', async () => {
    const tx = buildGoogleTx();
    const onVerified = vi.fn();

    const outcome = await repositoryWith(tx).googleSignIn(
      buildGoogleData({ emailVerified: false }),
      onVerified,
    );

    expect(outcome.kind).toBe('CREATED');
    expect(tx.user.create.mock.calls[0][0].data.emailVerifiedAt).toBeNull();
    expect(tx.energyLedger.create).toHaveBeenCalledTimes(1);
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('links the provider to the existing account found by case-insensitive email, without any wallet or ledger write', async () => {
    const tx = buildGoogleTx();
    tx.user.findFirst.mockResolvedValue(
      buildUser({ email: 'Alice@Example.com' }),
    );
    const onVerified = vi.fn().mockResolvedValue(undefined);

    const outcome = await repositoryWith(tx).googleSignIn(
      buildGoogleData(),
      onVerified,
    );

    expect(outcome.kind).toBe('LINKED');
    expect(tx.userIdentity.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        provider: 'GOOGLE',
        providerAccountId: 'google-sub-1',
      },
    });
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
    expect(onVerified).toHaveBeenCalledWith(tx, 'user-1');
  });

  it('marks the linked account verified only once thanks to the conditional update', async () => {
    const tx = buildGoogleTx();
    tx.user.findFirst.mockResolvedValue(
      buildUser({ emailVerifiedAt: new Date('2026-08-01T00:00:00Z') }),
    );
    tx.user.updateMany.mockResolvedValue({ count: 0 });
    const onVerified = vi.fn();

    const outcome = await repositoryWith(tx).googleSignIn(
      buildGoogleData(),
      onVerified,
    );

    expect(outcome.kind).toBe('LINKED');
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('refuses to link an existing account when the Google email is unverified', async () => {
    const tx = buildGoogleTx();
    tx.user.findFirst.mockResolvedValue(buildUser());
    const onVerified = vi.fn();

    const outcome = await repositoryWith(tx).googleSignIn(
      buildGoogleData({ emailVerified: false }),
      onVerified,
    );

    expect(outcome.kind).toBe('UNVERIFIED_LINK_REFUSED');
    expect(tx.userIdentity.create).not.toHaveBeenCalled();
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('reports a conflict when the account already carries another Google identity', async () => {
    const tx = buildGoogleTx();
    tx.user.findFirst.mockResolvedValue(buildUser());
    tx.userIdentity.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'identity-2' });

    const outcome = await repositoryWith(tx).googleSignIn(
      buildGoogleData(),
      vi.fn(),
    );

    expect(outcome.kind).toBe('CONFLICT_OTHER_GOOGLE');
    expect(tx.userIdentity.create).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
  });

  it('signs in through the known identity without any grant nor duplicate badge event', async () => {
    const tx = buildGoogleTx();
    tx.userIdentity.findUnique.mockResolvedValue({
      id: 'identity-1',
      user: buildUser({ emailVerifiedAt: new Date('2026-08-01T00:00:00Z') }),
    });
    tx.user.updateMany.mockResolvedValue({ count: 0 });
    const onVerified = vi.fn();

    const outcome = await repositoryWith(tx).googleSignIn(
      buildGoogleData(),
      onVerified,
    );

    expect(outcome.kind).toBe('SIGNED_IN');
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.energyLedger.create).not.toHaveBeenCalled();
    expect(onVerified).not.toHaveBeenCalled();
  });

  it('retries once after a unique-constraint race and resolves through the identity path with no second grant', async () => {
    const winnerTx = buildGoogleTx();
    winnerTx.userIdentity.findUnique.mockResolvedValue({
      id: 'identity-1',
      user: buildUser({ emailVerifiedAt: new Date('2026-08-01T00:00:00Z') }),
    });
    winnerTx.user.updateMany.mockResolvedValue({ count: 0 });
    const raceError = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: 'test' },
    );
    const prisma = {
      $transaction: vi
        .fn()
        .mockRejectedValueOnce(raceError)
        .mockImplementationOnce((callback: (client: GoogleTx) => unknown) =>
          callback(winnerTx),
        ),
    };
    const repository = new AuthRepository(prisma as unknown as PrismaService);

    const outcome = await repository.googleSignIn(buildGoogleData(), vi.fn());

    expect(prisma.$transaction).toHaveBeenCalledTimes(2);
    expect(outcome.kind).toBe('SIGNED_IN');
    expect(winnerTx.energyLedger.create).not.toHaveBeenCalled();
  });

  it('leaves the google account creation more than the default five seconds so a cold database does not abort it', async () => {
    const tx = buildGoogleTx();
    const prisma = {
      $transaction: vi.fn((callback: (client: GoogleTx) => unknown) => callback(tx)),
    };
    const repository = new AuthRepository(prisma as unknown as PrismaService);

    await repository.googleSignIn(buildGoogleData(), vi.fn());

    const options = prisma.$transaction.mock.calls[0][1];
    expect(options.timeout).toBeGreaterThan(5000);
    expect(options.maxWait).toBeGreaterThan(0);
  });

  it('rethrows non-unique-constraint transaction failures without retrying', async () => {
    const prisma = {
      $transaction: vi.fn().mockRejectedValue(new Error('connection lost')),
    };
    const repository = new AuthRepository(prisma as unknown as PrismaService);

    await expect(
      repository.googleSignIn(buildGoogleData(), vi.fn()),
    ).rejects.toThrow('connection lost');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

