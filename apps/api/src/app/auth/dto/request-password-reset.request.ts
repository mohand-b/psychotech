import { RequestPasswordResetDto } from '@psychotech/shared';
import { IsEmail } from 'class-validator';

export class RequestPasswordResetRequest implements RequestPasswordResetDto {
  @IsEmail()
  email!: string;
}
