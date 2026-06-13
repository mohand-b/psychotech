import { Module } from '@nestjs/common';
import { EnergyModule } from '../energy/energy.module';
import { ScoringModule } from '../scoring/scoring.module';
import { SessionsController } from './sessions.controller';
import { SessionsRepository } from './sessions.repository';
import { SessionsService } from './sessions.service';

@Module({
  imports: [EnergyModule, ScoringModule],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsRepository],
})
export class SessionsModule {}
