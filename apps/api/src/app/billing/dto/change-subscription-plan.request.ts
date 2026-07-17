import { ChangeSubscriptionPlanDto, PaidTier, SubscriptionTier } from '@psychotech/shared';
import { IsIn } from 'class-validator';

export class ChangeSubscriptionPlanRequest implements ChangeSubscriptionPlanDto {
  @IsIn([SubscriptionTier.ESSENTIAL, SubscriptionTier.UNLIMITED])
  plan!: PaidTier;
}
