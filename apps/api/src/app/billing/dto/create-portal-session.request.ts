import { IsOptional, IsString, Matches } from 'class-validator';

export class CreatePortalSessionRequest {
  @IsOptional()
  @IsString()
  @Matches(/^\/(?!\/)/)
  returnPath?: string;
}
