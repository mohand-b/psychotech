import { Body, Controller, Get, Post } from '@nestjs/common';
import { EnergyStateDto, GiftCodeRedemptionDto } from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { RedeemGiftCodeRequest } from './dto/redeem-gift-code.request';
import { EnergyService } from './energy.service';

@Controller('me/energy')
export class EnergyController {
  constructor(private readonly energyService: EnergyService) {}

  @Get()
  getEnergy(@CurrentUser() userId: string): Promise<EnergyStateDto> {
    return this.energyService.getState(userId);
  }

  @Post('gift-codes')
  redeemGiftCode(
    @CurrentUser() userId: string,
    @Body() body: RedeemGiftCodeRequest,
  ): Promise<GiftCodeRedemptionDto> {
    return this.energyService.redeemGiftCode(userId, body.code);
  }
}
