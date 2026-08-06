import { EnergyPackId, PackCheckoutRequestDto } from '@psychotech/shared';
import { IsEnum } from 'class-validator';

export class PackCheckoutRequest implements PackCheckoutRequestDto {
  @IsEnum(EnergyPackId)
  packId!: EnergyPackId;
}
