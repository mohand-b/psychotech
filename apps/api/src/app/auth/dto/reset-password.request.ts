import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  ResetPasswordDto,
} from '@psychotech/shared';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordRequest implements ResetPasswordDto {
  @IsString()
  @MinLength(1)
  token!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}
