import { Injectable } from '@nestjs/common';
import { Sector as DbSector, User } from '@prisma/client';
import { Sector } from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { PrismaService } from '../prisma/prisma.service';

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

  findById(userId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id: userId } });
  }

  updateProfile(userId: string, update: ProfileUpdate): Promise<User> {
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
