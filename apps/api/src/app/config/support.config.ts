import { registerAs } from '@nestjs/config';
import { readOptional, readRequired } from './environment.readers';

export interface SupportConfig {
  supportEmail?: string;
  formTokenSecret: string;
}

export const supportConfig = registerAs(
  'support',
  (): SupportConfig => ({
    supportEmail: readOptional('SUPPORT_EMAIL'),
    formTokenSecret:
      readOptional('CONTACT_FORM_SECRET') ?? readRequired('JWT_ACCESS_SECRET'),
  }),
);
