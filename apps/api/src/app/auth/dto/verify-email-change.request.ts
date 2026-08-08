import { IsString, MinLength } from 'class-validator';

export class VerifyEmailChangeRequest {
  @IsString()
  @MinLength(1)
  token!: string;
}
