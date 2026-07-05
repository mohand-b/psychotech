import {
  AxisType,
  Sector,
  SessionMode,
  StartSessionDto,
  TargetedSessionOptionsDto,
} from '@psychotech/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, ValidateNested } from 'class-validator';

export class TargetedSessionOptionsRequest implements TargetedSessionOptionsDto {
  @IsBoolean()
  helpEnabled!: boolean;
}

export class StartSessionRequest implements StartSessionDto {
  @IsEnum(SessionMode)
  mode!: SessionMode;

  @IsEnum(Sector)
  sector!: Sector;

  @IsOptional()
  @IsEnum(AxisType)
  axis?: AxisType;

  @IsOptional()
  @ValidateNested()
  @Type(() => TargetedSessionOptionsRequest)
  options?: TargetedSessionOptionsRequest;
}
