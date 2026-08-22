import { Injectable } from '@nestjs/common';
import {
  AuthProvider,
  Sector as DbSector,
  EnergyLedgerReason,
  Prisma,
  User,
} from '@prisma/client';
import { SIGNUP_ENERGY_GRANT, Sector } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';

interface CreateAccountData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  timezone: string;
  currentSector: Sector;
  locale?: string;
  termsVersion: string;
  termsAcceptedAt: Date;
}

export interface GoogleSignInData {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  firstName: string;
  lastName: string;
  timezone: string;
  currentSector: Sector;
  termsVersion: string;
  termsAcceptedAt: Date;
  now: Date;
}

export type OnAccountVerified = (
  tx: Prisma.TransactionClient,
  userId: string,
) => Promise<void>;

export type GoogleSignInOutcome =
  | { kind: 'SIGNED_IN'; user: User; verifiedNow: boolean }
  | { kind: 'LINKED'; user: User; verifiedNow: boolean }
  | { kind: 'CREATED'; user: User; verifiedNow: boolean }
  | { kind: 'CONFLICT_OTHER_GOOGLE' }
  | { kind: 'UNVERIFIED_LINK_REFUSED' };

const ACCOUNT_TRANSACTION_TIMEOUT_MS = 15_000;
const ACCOUNT_TRANSACTION_MAX_WAIT_MS = 5_000;

const ACCOUNT_TRANSACTION_OPTIONS = {
  timeout: ACCOUNT_TRANSACTION_TIMEOUT_MS,
  maxWait: ACCOUNT_TRANSACTION_MAX_WAIT_MS,
};

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmailInsensitive(email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createAccount(data: CreateAccountData): Promise<User> {
    return this.prisma.$transaction(
      (tx) =>
        this.createUserWithSignupGrant(tx, {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          timezone: data.timezone,
          locale: data.locale,
          currentSector: mapEnumValue(DbSector, data.currentSector),
          termsVersion: data.termsVersion,
          termsAcceptedAt: data.termsAcceptedAt,
        }),
      ACCOUNT_TRANSACTION_OPTIONS,
    );
  }

  async googleSignIn(
    data: GoogleSignInData,
    onVerified: OnAccountVerified,
  ): Promise<GoogleSignInOutcome> {
    try {
      return await this.runGoogleSignIn(data, onVerified);
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return this.runGoogleSignIn(data, onVerified);
      }
      throw error;
    }
  }

  updateRefreshTokenHash(
    userId: string,
    refreshTokenHash: string | null,
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash },
    });
  }

  updatePasswordHash(userId: string, passwordHash: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
  }

  async setPendingEmail(userId: string, pendingEmail: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { pendingEmail },
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.prisma.user.delete({ where: { id: userId } });
  }

  async markLogin(userId: string, at: Date): Promise<void> {
    await this.prisma.user.updateMany({
      where: { id: userId },
      data: { lastLoginAt: at },
    });
  }

  private runGoogleSignIn(
    data: GoogleSignInData,
    onVerified: OnAccountVerified,
  ): Promise<GoogleSignInOutcome> {
    return this.prisma.$transaction(async (tx) => {
      const identity = await tx.userIdentity.findUnique({
        where: {
          provider_providerAccountId: {
            provider: AuthProvider.GOOGLE,
            providerAccountId: data.providerAccountId,
          },
        },
        include: { user: true },
      });
      if (identity) {
        const verifiedNow = data.emailVerified
          ? await this.markVerifiedWithin(tx, identity.user.id, data.now, onVerified)
          : false;
        return {
          kind: 'SIGNED_IN',
          user: this.withVerification(identity.user, verifiedNow, data.now),
          verifiedNow,
        };
      }
      const existing = await tx.user.findFirst({
        where: { email: { equals: data.email, mode: 'insensitive' } },
      });
      if (existing) {
        if (!data.emailVerified) {
          return { kind: 'UNVERIFIED_LINK_REFUSED' };
        }
        const linkedGoogle = await tx.userIdentity.findUnique({
          where: {
            userId_provider: {
              userId: existing.id,
              provider: AuthProvider.GOOGLE,
            },
          },
        });
        if (linkedGoogle) {
          return { kind: 'CONFLICT_OTHER_GOOGLE' };
        }
        await tx.userIdentity.create({
          data: {
            userId: existing.id,
            provider: AuthProvider.GOOGLE,
            providerAccountId: data.providerAccountId,
          },
        });
        const verifiedNow = await this.markVerifiedWithin(
          tx,
          existing.id,
          data.now,
          onVerified,
        );
        return {
          kind: 'LINKED',
          user: this.withVerification(existing, verifiedNow, data.now),
          verifiedNow,
        };
      }
      const user = await this.createUserWithSignupGrant(tx, {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        timezone: data.timezone,
        currentSector: mapEnumValue(DbSector, data.currentSector),
        termsVersion: data.termsVersion,
        termsAcceptedAt: data.termsAcceptedAt,
        emailVerifiedAt: data.emailVerified ? data.now : null,
        identities: {
          create: {
            provider: AuthProvider.GOOGLE,
            providerAccountId: data.providerAccountId,
          },
        },
      });
      if (data.emailVerified) {
        await onVerified(tx, user.id);
      }
      return { kind: 'CREATED', user, verifiedNow: data.emailVerified };
    }, ACCOUNT_TRANSACTION_OPTIONS);
  }

  private async createUserWithSignupGrant(
    tx: Prisma.TransactionClient,
    data: Prisma.UserCreateInput,
  ): Promise<User> {
    const user = await tx.user.create({
      data: {
        ...data,
        energyWallet: {
          create: { balance: SIGNUP_ENERGY_GRANT },
        },
      },
    });
    await tx.energyLedger.create({
      data: {
        userId: user.id,
        delta: SIGNUP_ENERGY_GRANT,
        reason: EnergyLedgerReason.SIGNUP_GRANT,
        balanceAfter: SIGNUP_ENERGY_GRANT,
        ref: user.id,
      },
    });
    return user;
  }

  private async markVerifiedWithin(
    tx: Prisma.TransactionClient,
    userId: string,
    now: Date,
    onVerified: OnAccountVerified,
  ): Promise<boolean> {
    const marked = await tx.user.updateMany({
      where: { id: userId, emailVerifiedAt: null },
      data: { emailVerifiedAt: now },
    });
    if (marked.count === 0) {
      return false;
    }
    await onVerified(tx, userId);
    return true;
  }

  private withVerification(user: User, verifiedNow: boolean, now: Date): User {
    return verifiedNow ? { ...user, emailVerifiedAt: now } : user;
  }
}
