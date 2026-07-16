import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { EnergyController } from './energy.controller';
import { EnergyRepository } from './energy.repository';
import { EnergyService } from './energy.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [EnergyController],
  providers: [EnergyService, EnergyRepository],
  exports: [EnergyService],
})
export class EnergyModule {}
