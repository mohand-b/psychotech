import { VerifyEmailRequestDto } from '@psychotech/shared';
import { IsString, Length } from 'class-validator';

const TOKEN_HEX_LENGTH = 64;

export class VerifyEmailRequest implements VerifyEmailRequestDto {
  @IsString()
  @Length(TOKEN_HEX_LENGTH, TOKEN_HEX_LENGTH)
  token!: string;
}
