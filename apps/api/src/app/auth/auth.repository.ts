import { Injectable } from '@nestjs/common';
import {
  Sector as DbSector,
  SubscriptionStatus,
  SubscriptionTier,
  User,
} from '@prisma/client';
import { Sector } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateAccountData {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  timezone: string;
  currentSector: Sector;
  locale?: string;
}

const INITIAL_ENERGY_BALANCE = 5;
const INITIAL_ENERGY_CAPACITY = 5;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createAccount(data: CreateAccountData): Promise<User> {
    return this.prisma.$transaction((tx) =>
      tx.user.create({
        data: {
          email: data.email,
          passwordHash: data.passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          timezone: data.timezone,
          locale: data.locale,
          currentSector: mapEnumValue(DbSector, data.currentSector),
          energyWallet: {
            create: {
              balance: INITIAL_ENERGY_BALANCE,
              capacity: INITIAL_ENERGY_CAPACITY,
            },
          },
          subscription: {
            create: {
              tier: SubscriptionTier.FREE,
              status: SubscriptionStatus.ACTIVE,
            },
          },
        },
      }),
    );
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
}
