import {
  AxisType,
  CompleteTargetedSessionDto,
  LogicItemAnswerDto,
} from '@psychotech/shared';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export class LogicItemAnswerRequest implements LogicItemAnswerDto {
  @IsInt()
  @Min(0)
  index!: number;

  @ValidateIf((answer: LogicItemAnswerRequest) => answer.answerIndex !== null)
  @IsInt()
  @Min(0)
  answerIndex!: number | null;

  @IsInt()
  @Min(0)
  timeMs!: number;

  @IsBoolean()
  helpUsed!: boolean;
}

export class CompleteTargetedSessionRequest implements CompleteTargetedSessionDto {
  @IsEnum(AxisType)
  axis!: AxisType;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LogicItemAnswerRequest)
  items!: LogicItemAnswerRequest[];
}
