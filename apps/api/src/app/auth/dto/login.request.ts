import { LoginDto } from '@psychotech/shared';
import { IsEmail, IsString } from 'class-validator';

export class LoginRequest implements LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}
