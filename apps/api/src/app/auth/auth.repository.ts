import { Injectable } from '@nestjs/common';
import { Sector as DbSector, User } from '@prisma/client';
import { Sector } from '@psychotech/shared';
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

const INITIAL_ENERGY_BALANCE = 0;

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
          termsVersion: data.termsVersion,
          termsAcceptedAt: data.termsAcceptedAt,
          energyWallet: {
            create: { balance: INITIAL_ENERGY_BALANCE },
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
}
