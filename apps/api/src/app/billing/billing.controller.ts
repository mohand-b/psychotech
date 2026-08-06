import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import {
  BillingConfigDto,
  PackCheckoutSessionDto,
  PackCheckoutStatusDto,
} from '@psychotech/shared';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../auth/decorators/skip-csrf.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { BillingService } from './billing.service';
import { PackCheckoutRequest } from './dto/pack-checkout.request';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('config')
  getConfig(): BillingConfigDto {
    return this.billingService.getConfig();
  }

  @Post('pack-checkout')
  createPackCheckout(
    @CurrentUser() userId: string,
    @Body() request: PackCheckoutRequest,
  ): Promise<PackCheckoutSessionDto> {
    return this.billingService.createPackCheckout(userId, request.packId);
  }

  @Get('pack-checkout/:sessionId')
  getPackCheckoutStatus(
    @CurrentUser() userId: string,
    @Param('sessionId') sessionId: string,
  ): Promise<PackCheckoutStatusDto> {
    return this.billingService.getPackCheckoutStatus(userId, sessionId);
  }

  @Public()
  @SkipCsrf()
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<void> {
    await this.billingService.handleWebhook(request.rawBody, signature);
  }
}
