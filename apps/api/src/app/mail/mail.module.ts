import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailConfig } from '../config/mail.config';
import { LogMailer } from './log-mailer';
import { MAILER } from './mailer.port';
import { ResendMailer } from './resend-mailer';

const mailerProvider: Provider = {
  provide: MAILER,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const config = configService.getOrThrow<MailConfig>('mail');
    return config.resendApiKey
      ? new ResendMailer(config.resendApiKey, config.from)
      : new LogMailer();
  },
};

@Module({
  providers: [mailerProvider],
  exports: [mailerProvider],
})
export class MailModule {}
