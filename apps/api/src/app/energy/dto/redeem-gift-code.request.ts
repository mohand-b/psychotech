import { RedeemGiftCodeDto } from '@psychotech/shared';
import { IsString, Length } from 'class-validator';

export class RedeemGiftCodeRequest implements RedeemGiftCodeDto {
  @IsString()
  @Length(3, 40)
  code!: string;
}
