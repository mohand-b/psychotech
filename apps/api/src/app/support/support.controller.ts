import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
} from '@nestjs/common';
import { ContactFormTokenDto, ContactReceiptDto } from '@psychotech/shared';
import { Public } from '../auth/decorators/public.decorator';
import { SkipCsrf } from '../auth/decorators/skip-csrf.decorator';
import { IpRateLimitService } from '../auth/ip-rate-limit.service';
import { CurrentUser } from '../common/current-user.decorator';
import { SubmitContactRequest } from './dto/submit-contact.request';
import { SupportService } from './support.service';

const FORM_TOKEN_IP_LIMIT = { limit: 60, windowMs: 3_600_000 };

@Controller('support/contact')
export class SupportController {
  constructor(
    private readonly supportService: SupportService,
    private readonly rateLimit: IpRateLimitService,
  ) {}

  @Public()
  @Get('token')
  formToken(@Ip() ip: string): ContactFormTokenDto {
    this.rateLimit.assertAllowed(`contact-token:${ip}`, FORM_TOKEN_IP_LIMIT);
    return { token: this.supportService.issueFormToken() };
  }

  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.CREATED)
  @Post()
  submitAnonymously(
    @Body() request: SubmitContactRequest,
    @Ip() ip: string,
  ): Promise<ContactReceiptDto> {
    return this.supportService.submit(request, { ip, userId: null });
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('account')
  submitFromAccount(
    @CurrentUser() userId: string,
    @Body() request: SubmitContactRequest,
    @Ip() ip: string,
  ): Promise<ContactReceiptDto> {
    return this.supportService.submit(request, { ip, userId });
  }
}
