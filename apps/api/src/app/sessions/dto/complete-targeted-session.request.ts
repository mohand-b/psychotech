import {
  AxisType,
  CompleteTargetedSessionDto,
  LogicItemAnswerDto,
  MemorySequenceAnswerDto,
} from '@psychotech/shared';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  Max,
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

export class MemorySequenceAnswerRequest implements MemorySequenceAnswerDto {
  @IsInt()
  @Min(0)
  index!: number;

  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(9, { each: true })
  input!: number[];

  @IsInt()
  @Min(0)
  timeMs!: number;

  @IsBoolean()
  timedOut!: boolean;
}

export class CompleteTargetedSessionRequest implements CompleteTargetedSessionDto {
  @IsEnum(AxisType)
  axis!: AxisType;

  @ValidateIf((request: CompleteTargetedSessionRequest) => request.axis === AxisType.LOGIC)
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LogicItemAnswerRequest)
  items?: LogicItemAnswerRequest[];

  @ValidateIf((request: CompleteTargetedSessionRequest) => request.axis === AxisType.MEMORY)
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MemorySequenceAnswerRequest)
  sequences?: MemorySequenceAnswerRequest[];
}
