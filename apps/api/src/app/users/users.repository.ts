import { Injectable } from '@nestjs/common';
import { Sector as DbSector, Subscription, User } from '@prisma/client';
import { Sector } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';

export type UserWithSubscription = User & {
  subscription: Subscription | null;
};

export interface ProfileUpdate {
  firstName?: string;
  lastName?: string;
  locale?: string;
  timezone?: string;
  currentSector?: Sector;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(userId: string): Promise<UserWithSubscription | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });
  }

  updateProfile(
    userId: string,
    update: ProfileUpdate,
  ): Promise<UserWithSubscription> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: update.firstName,
        lastName: update.lastName,
        locale: update.locale,
        timezone: update.timezone,
        currentSector: update.currentSector
          ? mapEnumValue(DbSector, update.currentSector)
          : undefined,
      },
      include: { subscription: true },
    });
  }

  async isSectorActive(sector: Sector): Promise<boolean> {
    const config = await this.prisma.sectorConfig.findUnique({
      where: { sector: mapEnumValue(DbSector, sector) },
      select: { isActive: true },
    });
    return config?.isActive ?? false;
  }
}
