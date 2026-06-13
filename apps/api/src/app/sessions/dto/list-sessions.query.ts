import { AxisType, SessionMode } from '@psychotech/shared';
import { IsEnum, IsISO8601, IsOptional } from 'class-validator';

export class ListSessionsQuery {
  @IsOptional()
  @IsEnum(SessionMode)
  mode?: SessionMode;

  @IsOptional()
  @IsEnum(AxisType)
  axis?: AxisType;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}
