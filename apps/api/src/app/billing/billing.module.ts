import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { stripeClientProvider } from './stripe.client';

@Module({
  controllers: [BillingController],
  providers: [BillingService, BillingRepository, stripeClientProvider],
})
export class BillingModule {}
