import { CreateCheckoutSessionDto, PaidTier, SubscriptionTier } from '@psychotech/shared';
import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateCheckoutSessionRequest implements CreateCheckoutSessionDto {
  @IsIn([SubscriptionTier.ESSENTIAL, SubscriptionTier.UNLIMITED])
  plan!: PaidTier;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  promotionCode?: string;
}
