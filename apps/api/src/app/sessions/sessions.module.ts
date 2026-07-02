import { Module } from '@nestjs/common';
import { BadgesModule } from '../badges/badges.module';
import { ScoringModule } from '../scoring/scoring.module';
import { SessionsController } from './sessions.controller';
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';

@Module({
  imports: [ScoringModule, BadgesModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
