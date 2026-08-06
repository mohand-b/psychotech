import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
} from '@nestjs/common';
import {
  BadgeId,
  BadgeStatusDto,
  UnacknowledgedBadgeDto,
} from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { BadgesService } from './badges.service';

@Controller('me/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  getBadges(@CurrentUser() userId: string): Promise<BadgeStatusDto[]> {
    return this.badgesService.getCollection(userId);
  }

  @Get('unacknowledged')
  getUnacknowledged(
    @CurrentUser() userId: string,
  ): Promise<UnacknowledgedBadgeDto[]> {
    return this.badgesService.getUnacknowledged(userId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post(':badgeId/acknowledge')
  async acknowledge(
    @CurrentUser() userId: string,
    @Param('badgeId', new ParseEnumPipe(BadgeId)) badgeId: BadgeId,
  ): Promise<void> {
    await this.badgesService.acknowledge(userId, badgeId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('tutorial-discovered')
  async tutorialDiscovered(@CurrentUser() userId: string): Promise<void> {
    await this.badgesService.markTutorialDiscovered(userId);
  }
}
