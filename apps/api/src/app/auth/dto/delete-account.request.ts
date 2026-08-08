import { DELETE_ACCOUNT_CONFIRMATION, DeleteAccountDto } from '@psychotech/shared';
import { Equals, IsString, MinLength } from 'class-validator';

export class DeleteAccountRequest implements DeleteAccountDto {
  @IsString()
  @MinLength(1)
  password!: string;

  @Equals(DELETE_ACCOUNT_CONFIRMATION)
  confirmation!: string;
}
