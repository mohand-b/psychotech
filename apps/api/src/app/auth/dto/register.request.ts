import { RegisterDto } from '@psychotech/shared';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 100;

export class RegisterRequest implements RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;

  @IsString()
  @MinLength(1)
  displayName!: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsString()
  timezone?: string;
}
