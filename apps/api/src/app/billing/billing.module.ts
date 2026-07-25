import { Module } from '@nestjs/common';
import { EnergyModule } from '../energy/energy.module';
import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { stripeClientProvider } from './stripe.client';

@Module({
  imports: [EnergyModule],
  controllers: [BillingController],
  providers: [BillingService, BillingRepository, stripeClientProvider],
})
export class BillingModule {}
