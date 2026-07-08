import { AxisType, SessionMode } from '@psychotech/shared';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class ListSessionsQuery {
  @IsOptional()
  @IsEnum(SessionMode)
  mode?: SessionMode;

  @IsOptional()
  @IsEnum(AxisType)
  axis?: AxisType;

  @IsOptional()
  @IsUUID()
  cursor?: string;
}
