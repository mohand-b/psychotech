import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import {
  BadgeFeedDto,
  BadgeId,
  BadgeStatusDto,
  EarnedBadgeDto,
  NewBadgesPayload,
} from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { BadgesService } from './badges.service';
import { NewBadgesInterceptor } from './new-badges.interceptor';

@Controller('me/badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  getBadges(@CurrentUser() userId: string): Promise<BadgeStatusDto[]> {
    return this.badgesService.getCollection(userId);
  }

  @Get('feed')
  getFeed(): Promise<BadgeFeedDto> {
    return this.badgesService.getFeed();
  }

  @Get('unacknowledged')
  getUnacknowledged(
    @CurrentUser() userId: string,
  ): Promise<EarnedBadgeDto[]> {
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

  @UseInterceptors(NewBadgesInterceptor)
  @HttpCode(HttpStatus.OK)
  @Post('tutorial-discovered')
  async tutorialDiscovered(
    @CurrentUser() userId: string,
  ): Promise<NewBadgesPayload> {
    await this.badgesService.markTutorialDiscovered(userId);
    return {};
  }
}
