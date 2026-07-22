import { Module } from '@nestjs/common';
import { BadgesModule } from '../badges/badges.module';
import { EnergyModule } from '../energy/energy.module';
import { ScoringModule } from '../scoring/scoring.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SessionsController } from './sessions.controller';
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';

@Module({
  imports: [ScoringModule, BadgesModule, SubscriptionsModule, EnergyModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
