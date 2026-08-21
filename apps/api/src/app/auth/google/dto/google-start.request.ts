import { SSO_ORIGINS, Sector, SsoOrigin } from '@psychotech/shared';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const RETURN_URL_MAX_LENGTH = 512;

export class GoogleStartRequest {
  @IsOptional()
  @IsIn(SSO_ORIGINS)
  from?: SsoOrigin;

  @IsOptional()
  @IsEnum(Sector)
  sector?: Sector;

  @IsOptional()
  @IsString()
  @MaxLength(RETURN_URL_MAX_LENGTH)
  returnUrl?: string;
}
