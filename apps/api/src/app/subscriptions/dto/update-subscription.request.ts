import { SubscriptionTier, UpdateSubscriptionDto } from '@psychotech/shared';
import { IsEnum } from 'class-validator';

export class UpdateSubscriptionRequest implements UpdateSubscriptionDto {
  @IsEnum(SubscriptionTier)
  tier!: SubscriptionTier;
}
