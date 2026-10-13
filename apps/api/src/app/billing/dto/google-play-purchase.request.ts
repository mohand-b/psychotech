import { EnergyPackId, GooglePlayPurchaseRequestDto } from '@psychotech/shared';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const PURCHASE_TOKEN_MAX_LENGTH = 1024;

export class GooglePlayPurchaseRequest implements GooglePlayPurchaseRequestDto {
  @IsEnum(EnergyPackId)
  packId!: EnergyPackId;

  @IsString()
  @IsNotEmpty()
  @MaxLength(PURCHASE_TOKEN_MAX_LENGTH)
  purchaseToken!: string;
}
