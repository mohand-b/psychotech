import { Module } from '@nestjs/common';
import { EnergyModule } from '../energy/energy.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { stripeClientProvider } from './stripe.client';

@Module({
  imports: [EnergyModule, SubscriptionsModule],
  controllers: [BillingController],
  providers: [BillingService, BillingRepository, stripeClientProvider],
})
export class BillingModule {}
