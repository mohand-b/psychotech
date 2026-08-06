import { registerAs } from '@nestjs/config';
import { readOptional } from './environment.readers';

export interface MailConfig {
  resendApiKey?: string;
  from: string;
  appBaseUrl?: string;
}

export const mailConfig = registerAs('mail', (): MailConfig => ({
  resendApiKey: readOptional('RESEND_API_KEY'),
  from: readOptional('MAIL_FROM') ?? 'PsychoTech <no-reply@psychotech.app>',
  appBaseUrl: readOptional('APP_PUBLIC_URL') ?? readOptional('CORS_ORIGIN'),
}));
