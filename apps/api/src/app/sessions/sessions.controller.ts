import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  AxisType,
  SessionDto,
  SessionResultDto,
  TargetedAxisResultDto,
} from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { CompleteTargetedSessionRequest } from './dto/complete-targeted-session.request';
import { ListSessionsQuery } from './dto/list-sessions.query';
import { StartSessionRequest } from './dto/start-session.request';
import { SubmitAxisResultRequest } from './dto/submit-axis-result.request';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  start(
    @CurrentUser() userId: string,
    @Body() request: StartSessionRequest,
  ): Promise<SessionDto> {
    return this.sessionsService.start(userId, request);
  }

  @Post(':id/axes/:axis/submit')
  submit(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('axis', new ParseEnumPipe(AxisType)) axis: AxisType,
    @Body() request: SubmitAxisResultRequest,
  ): Promise<SessionDto> {
    return this.sessionsService.submitAxis(userId, sessionId, axis, request);
  }

  @Post(':id/axes/:axis/results')
  completeTargeted(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('axis', new ParseEnumPipe(AxisType)) axis: AxisType,
    @Body() request: CompleteTargetedSessionRequest,
  ): Promise<SessionDto> {
    return this.sessionsService.completeTargeted(userId, sessionId, axis, request);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionResultDto> {
    return this.sessionsService.complete(userId, sessionId);
  }

  @Post(':id/suspend')
  suspend(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionDto> {
    return this.sessionsService.suspend(userId, sessionId);
  }

  @Post(':id/abandon')
  abandon(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionDto> {
    return this.sessionsService.abandon(userId, sessionId);
  }

  @Get()
  list(
    @CurrentUser() userId: string,
    @Query() query: ListSessionsQuery,
  ): Promise<SessionDto[]> {
    return this.sessionsService.list(userId, query);
  }

  @Get(':id')
  get(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionDto> {
    return this.sessionsService.get(userId, sessionId);
  }

  @Get(':id/results')
  results(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
  ): Promise<SessionResultDto> {
    return this.sessionsService.results(userId, sessionId);
  }

  @Get(':id/axes/:axis/results')
  targetedResult(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Param('axis', new ParseEnumPipe(AxisType)) axis: AxisType,
  ): Promise<TargetedAxisResultDto> {
    return this.sessionsService.targetedResult(userId, sessionId, axis);
  }
}
