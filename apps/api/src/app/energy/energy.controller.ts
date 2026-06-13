import { Controller, Get } from '@nestjs/common';
import { EnergyStateDto } from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { EnergyService } from './energy.service';

@Controller('me/energy')
export class EnergyController {
  constructor(private readonly energyService: EnergyService) {}

  @Get()
  getEnergy(@CurrentUser() userId: string): Promise<EnergyStateDto> {
    return this.energyService.getState(userId);
  }
}
