import {
  Controller,
  Get,
  Headers,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { BillingConfigDto } from '@psychotech/shared';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../auth/decorators/skip-csrf.decorator';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('config')
  getConfig(): BillingConfigDto {
    return this.billingService.getConfig();
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
