import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { BillingRedirectDto } from '@psychotech/shared';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../auth/decorators/skip-csrf.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionRequest } from './dto/create-checkout-session.request';

const STRIPE_SIGNATURE_HEADER = 'stripe-signature';

function resolveOrigin(request: Request): string {
  return (
    request.headers.origin ?? `${request.protocol}://${request.get('host')}`
  );
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  createCheckoutSession(
    @CurrentUser() userId: string,
    @Body() body: CreateCheckoutSessionRequest,
    @Req() request: Request,
  ): Promise<BillingRedirectDto> {
    return this.billingService.createCheckoutSession(
      userId,
      body.plan,
      resolveOrigin(request),
    );
  }

  @Post('portal')
  createPortalSession(
    @CurrentUser() userId: string,
    @Req() request: Request,
  ): Promise<BillingRedirectDto> {
    return this.billingService.createPortalSession(
      userId,
      resolveOrigin(request),
    );
  }

  @Public()
  @SkipCsrf()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() request: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const signature = request.headers[STRIPE_SIGNATURE_HEADER];
    await this.billingService.handleWebhook(
      request.rawBody,
      typeof signature === 'string' ? signature : undefined,
    );
    return { received: true };
  }
}
