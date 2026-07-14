import { Body, Controller, Patch } from '@nestjs/common';
import { SubscriptionDto } from '@psychotech/shared';
import { CurrentUser } from '../common/current-user.decorator';
import { UpdateSubscriptionRequest } from './dto/update-subscription.request';
import { SubscriptionsService } from './subscriptions.service';

@Controller('me/subscription')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Patch()
  changeTier(
    @CurrentUser() userId: string,
    @Body() request: UpdateSubscriptionRequest,
  ): Promise<SubscriptionDto> {
    return this.subscriptionsService.changeTier(userId, request.tier);
  }
}
