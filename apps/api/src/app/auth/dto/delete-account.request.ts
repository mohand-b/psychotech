import {
  DELETE_ACCOUNT_CONFIRMATION,
  DeleteAccountDto,
} from '@psychotech/shared';
import { Equals, IsOptional, IsString, MinLength } from 'class-validator';

export class DeleteAccountRequest implements DeleteAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  password?: string;

  @Equals(DELETE_ACCOUNT_CONFIRMATION)
  confirmation!: string;
}
