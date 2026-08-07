import { Module } from '@nestjs/common';
import { BadgeCollector } from './badge-collector';
import { BadgeRarityService } from './badge-rarity.service';
import { BadgesController } from './badges.controller';
import { BadgesRepository } from './badges.repository';
import { BadgesService } from './badges.service';
import { NewBadgesInterceptor } from './new-badges.interceptor';

@Module({
  controllers: [BadgesController],
  providers: [
    BadgesService,
    BadgesRepository,
    BadgeRarityService,
    BadgeCollector,
    NewBadgesInterceptor,
  ],
  exports: [BadgesService, BadgeCollector, NewBadgesInterceptor],
})
export class BadgesModule {}
