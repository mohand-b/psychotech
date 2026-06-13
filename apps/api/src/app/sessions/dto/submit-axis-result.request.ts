import { AxisMetrics, AxisType, SubmitAxisResultDto } from '@psychotech/shared';
import { IsBoolean, IsEnum, IsObject, IsOptional } from 'class-validator';

export class SubmitAxisResultRequest implements SubmitAxisResultDto {
  @IsEnum(AxisType)
  axis!: AxisType;

  @IsOptional()
  @IsObject()
  metrics?: AxisMetrics;

  @IsOptional()
  @IsBoolean()
  skipped?: boolean;
}
