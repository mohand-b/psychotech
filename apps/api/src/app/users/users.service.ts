import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateUserProfileDto, UserProfileDto } from '@psychotech/shared';
import { TierResolutionService } from '../subscriptions/tier-resolution.service';
import { toUserProfileDto } from './users.mappers';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly repository: UsersRepository,
    private readonly tierResolution: TierResolutionService,
  ) {}

  async getProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.repository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return toUserProfileDto(user, this.tierResolution.resolve(user.subscription));
  }

  async updateProfile(
    userId: string,
    update: UpdateUserProfileDto,
  ): Promise<UserProfileDto> {
    if (
      update.currentSector &&
      !(await this.repository.isSectorActive(update.currentSector))
    ) {
      throw new BadRequestException('The selected sector is not available');
    }
    const user = await this.repository.updateProfile(userId, {
      firstName: update.firstName,
      lastName: update.lastName,
      locale: update.locale,
      timezone: update.timezone,
      currentSector: update.currentSector,
    });
    return toUserProfileDto(user, this.tierResolution.resolve(user.subscription));
  }
}
