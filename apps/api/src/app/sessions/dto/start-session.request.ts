import {
  AxisType,
  Sector,
  SessionMode,
  StartSessionDto,
  TargetedSessionOptionsDto,
  TrainingOptionId,
} from '@psychotech/shared';
import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';

export class TargetedSessionOptionsRequest implements TargetedSessionOptionsDto {
  @IsArray()
  @IsEnum(TrainingOptionId, { each: true })
  enabledOptions!: TrainingOptionId[];
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
