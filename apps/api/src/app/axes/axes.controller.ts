import { Controller, Get } from '@nestjs/common';
import { AxisBestDto } from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { AxesService } from './axes.service';

@Controller('me/axes')
export class AxesController {
  constructor(private readonly axesService: AxesService) {}

  @Get('best')
  getBestScores(@CurrentUser() userId: string): Promise<AxisBestDto[]> {
    return this.axesService.getBestScores(userId);
  }
}
