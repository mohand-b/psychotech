import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UserProfileDto } from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { UpdateUserProfileRequest } from './dto/update-user-profile.request';
import { UsersService } from './users.service';

@Controller('me')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@CurrentUser() userId: string): Promise<UserProfileDto> {
    return this.usersService.getProfile(userId);
  }

  @Patch()
  updateProfile(
    @CurrentUser() userId: string,
    @Body() request: UpdateUserProfileRequest,
  ): Promise<UserProfileDto> {
    return this.usersService.updateProfile(userId, request);
  }
}
