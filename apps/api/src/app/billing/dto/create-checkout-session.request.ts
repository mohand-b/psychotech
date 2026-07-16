import { CreateCheckoutSessionDto, PaidTier, SubscriptionTier } from '@psychotech/shared';
import { IsIn } from 'class-validator';

export class CreateCheckoutSessionRequest implements CreateCheckoutSessionDto {
  @IsIn([SubscriptionTier.ESSENTIAL, SubscriptionTier.UNLIMITED])
  plan!: PaidTier;
}
