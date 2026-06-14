import { Controller, Get } from '@nestjs/common';
import { ProgressionDto } from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { ProgressionService } from './progression.service';

@Controller('me/progression')
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get()
  getProgression(@CurrentUser() userId: string): Promise<ProgressionDto> {
    return this.progressionService.getProgression(userId);
  }
}
