import {
  AxisType,
  CompleteTargetedSessionDto,
  DiscriminationAnswer,
  DiscriminationTrialAnswerDto,
  LogicItemAnswerDto,
  MemorySequenceAnswerDto,
  ReactivityCommand,
  ReactivityStimulusAnswerDto,
  ReactivityWaitPressDto,
} from '@psychotech/shared';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
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

  @IsBoolean()
  visited!: boolean;
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

export class DiscriminationTrialAnswerRequest
  implements DiscriminationTrialAnswerDto
{
  @IsInt()
  @Min(0)
  index!: number;

  @ValidateIf((trial: DiscriminationTrialAnswerRequest) => trial.answer !== null)
  @IsIn(['IDENTICAL', 'DIFFERENT'])
  answer!: DiscriminationAnswer | null;

  @IsInt()
  @Min(0)
  timeMs!: number;
}

export class ReactivityStimulusAnswerRequest
  implements ReactivityStimulusAnswerDto
{
  @IsInt()
  @Min(0)
  index!: number;

  @ValidateIf(
    (stimulus: ReactivityStimulusAnswerRequest) =>
      stimulus.commandPressed !== null,
  )
  @IsIn(['LEFT', 'RIGHT', 'SPACE'])
  commandPressed!: ReactivityCommand | null;

  @ValidateIf(
    (stimulus: ReactivityStimulusAnswerRequest) => stimulus.trMs !== null,
  )
  @IsInt()
  @Min(0)
  trMs!: number | null;
}

export class ReactivityWaitPressRequest implements ReactivityWaitPressDto {
  @IsInt()
  @Min(0)
  atMs!: number;
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

  @ValidateIf(
    (request: CompleteTargetedSessionRequest) =>
      request.axis === AxisType.VISUAL_DISCRIMINATION,
  )
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DiscriminationTrialAnswerRequest)
  trials?: DiscriminationTrialAnswerRequest[];

  @ValidateIf(
    (request: CompleteTargetedSessionRequest) =>
      request.axis === AxisType.REACTIVITY,
  )
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReactivityStimulusAnswerRequest)
  stimuli?: ReactivityStimulusAnswerRequest[];

  @ValidateIf(
    (request: CompleteTargetedSessionRequest) =>
      request.axis === AxisType.REACTIVITY,
  )
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReactivityWaitPressRequest)
  waitPresses?: ReactivityWaitPressRequest[];
}
