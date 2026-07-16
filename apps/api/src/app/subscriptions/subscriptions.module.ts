import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsRepository } from './subscriptions.repository';
import { SubscriptionsService } from './subscriptions.service';
import { TierResolutionService } from './tier-resolution.service';

@Module({
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionsRepository,
    TierResolutionService,
  ],
  exports: [SubscriptionsRepository, TierResolutionService],
})
export class SubscriptionsModule {}
