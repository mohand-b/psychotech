import { Sector, UpdateUserProfileDto } from '@psychotech/shared';
import {
  IsBoolean,
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
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsString()
  locale?: string;

  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @IsOptional()
  @IsEnum(Sector)
  currentSector?: Sector;

  @IsOptional()
  @IsBoolean()
  showInFeed?: boolean;
}
