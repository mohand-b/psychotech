import { Controller, Get } from '@nestjs/common';
import { BadgeStatusDto } from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { BadgesService } from './badges.service';

@Controller('me/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  getBadges(@CurrentUser() userId: string): Promise<BadgeStatusDto[]> {
    return this.badgesService.getCollection(userId);
  }
}
