import {
  ChangePasswordDto,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from '@psychotech/shared';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordRequest implements ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}
