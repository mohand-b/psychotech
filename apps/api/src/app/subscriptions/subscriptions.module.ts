import { Module } from '@nestjs/common';
import { TierResolutionService } from './tier-resolution.service';

@Module({
  providers: [TierResolutionService],
  exports: [TierResolutionService],
})
export class SubscriptionsModule {}
