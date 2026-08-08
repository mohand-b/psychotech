import { RequestEmailChangeDto } from '@psychotech/shared';
import { IsEmail } from 'class-validator';

export class RequestEmailChangeRequest implements RequestEmailChangeDto {
  @IsEmail()
  newEmail!: string;
}
