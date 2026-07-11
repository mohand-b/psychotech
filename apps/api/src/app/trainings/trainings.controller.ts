import { Controller, Get, Query } from '@nestjs/common';
import { TrainingsOverviewDto } from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { TrainingsOverviewQuery } from './dto/trainings-overview.query';
import { TrainingsService } from './trainings.service';

@Controller('me/trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  @Get('overview')
  getOverview(
    @CurrentUser() userId: string,
    @Query() query: TrainingsOverviewQuery,
  ): Promise<TrainingsOverviewDto> {
    return this.trainingsService.getOverview(userId, query.sector);
  }
}
