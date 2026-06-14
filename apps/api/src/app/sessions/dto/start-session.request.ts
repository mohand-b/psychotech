import { AxisType, Sector, SessionMode, StartSessionDto } from '@psychotech/shared';
import { IsEnum, IsOptional } from 'class-validator';

export class StartSessionRequest implements StartSessionDto {
  @IsEnum(SessionMode)
  mode!: SessionMode;

  @IsEnum(Sector)
  sector!: Sector;

  @IsOptional()
  @IsEnum(AxisType)
  axis?: AxisType;
}
