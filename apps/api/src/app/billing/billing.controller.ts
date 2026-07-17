import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import {
  BillingConfigDto,
  ChangePlanPreviewDto,
  PaymentMethodOverviewDto,
  PromotionCodeDto,
  SubscriptionDto,
  SubscriptionPaymentDto,
} from '@psychotech/shared';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../auth/decorators/skip-csrf.decorator';
import { CurrentUser } from '../common/current-user.decorator';
import { BillingService } from './billing.service';
import { ChangeSubscriptionPlanRequest } from './dto/change-subscription-plan.request';
import { CreateSubscriptionRequest } from './dto/create-subscription.request';

const STRIPE_SIGNATURE_HEADER = 'stripe-signature';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('config')
  getBillingConfig(): BillingConfigDto {
    return this.billingService.getBillingConfig();
  }

  @Post('subscription')
  createSubscription(
    @CurrentUser() userId: string,
    @Body() body: CreateSubscriptionRequest,
  ): Promise<SubscriptionPaymentDto> {
    return this.billingService.createSubscription(
      userId,
      body.plan,
      body.promotionCode,
    );
  }

  @Post('subscription/change/preview')
  previewPlanChange(
    @CurrentUser() userId: string,
    @Body() body: ChangeSubscriptionPlanRequest,
  ): Promise<ChangePlanPreviewDto> {
    return this.billingService.previewPlanChange(userId, body.plan);
  }

  @Post('subscription/change')
  changeSubscriptionPlan(
    @CurrentUser() userId: string,
    @Body() body: ChangeSubscriptionPlanRequest,
  ): Promise<SubscriptionDto> {
    return this.billingService.changeSubscriptionPlan(userId, body.plan);
  }

  @Post('subscription/change/cancel')
  cancelPlanChange(@CurrentUser() userId: string): Promise<SubscriptionDto> {
    return this.billingService.cancelPlanChange(userId);
  }

  @Post('subscription/cancel')
  cancelSubscription(@CurrentUser() userId: string): Promise<SubscriptionDto> {
    return this.billingService.cancelSubscription(userId);
  }

  @Post('subscription/resume')
  resumeSubscription(@CurrentUser() userId: string): Promise<SubscriptionDto> {
    return this.billingService.resumeSubscription(userId);
  }

  @Get('payment-method')
  getPaymentMethodOverview(
    @CurrentUser() userId: string,
  ): Promise<PaymentMethodOverviewDto> {
    return this.billingService.getPaymentMethodOverview(userId);
  }

  @Post('payment-method/intent')
  createPaymentMethodSetup(
    @CurrentUser() userId: string,
  ): Promise<SubscriptionPaymentDto> {
    return this.billingService.createPaymentMethodSetup(userId);
  }

  @Get('promotion-codes/:code')
  findPromotionCode(@Param('code') code: string): Promise<PromotionCodeDto> {
    return this.billingService.findPromotionCode(code);
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
