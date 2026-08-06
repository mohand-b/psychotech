import { Module } from '@nestjs/common';
import { BadgeRarityService } from './badge-rarity.service';
import { BadgesController } from './badges.controller';
import { BadgesRepository } from './badges.repository';
import { BadgesService } from './badges.service';

@Module({
  controllers: [BadgesController],
  providers: [BadgesService, BadgesRepository, BadgeRarityService],
  exports: [BadgesService],
})
export class BadgesModule {}
