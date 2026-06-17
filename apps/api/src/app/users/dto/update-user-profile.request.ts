import { Sector, UpdateUserProfileDto } from '@psychotech/shared';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsTimeZone,
  MinLength,
} from 'class-validator';

export class UpdateUserProfileRequest implements UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  displayName?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @IsOptional()
  @IsEnum(Sector)
  currentSector?: Sector;
}
