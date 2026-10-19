import { Module } from '@nestjs/common';
import { EnergyModule } from '../energy/energy.module';
import { BillingController } from './billing.controller';
import { BillingRepository } from './billing.repository';
import { BillingService } from './billing.service';
import { GooglePlayBillingService } from './google-play/google-play-billing.service';
import { GooglePlayClient } from './google-play/google-play.client';
import { stripeClientProvider } from './stripe.client';

@Module({
  imports: [EnergyModule],
  controllers: [BillingController],
  providers: [
    BillingService,
    BillingRepository,
    stripeClientProvider,
    GooglePlayClient,
    GooglePlayBillingService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
