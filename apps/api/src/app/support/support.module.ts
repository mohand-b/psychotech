import { Module } from '@nestjs/common';
import { IpRateLimitService } from '../auth/ip-rate-limit.service';
import { MailModule } from '../mail/mail.module';
import { ContactFormTokenService } from './contact-form-token.service';
import { SupportController } from './support.controller';
import { SupportRepository } from './support.repository';
import { SupportService } from './support.service';

@Module({
  imports: [MailModule],
  controllers: [SupportController],
  providers: [
    SupportService,
    SupportRepository,
    ContactFormTokenService,
    IpRateLimitService,
  ],
})
export class SupportModule {}
