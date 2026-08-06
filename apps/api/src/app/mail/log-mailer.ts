import { Logger } from '@nestjs/common';
import { MailMessage, MailerPort } from './mailer.port';

export class LogMailer implements MailerPort {
  private readonly logger = new Logger('Mailer');

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `Email to ${message.to} — ${message.subject}\n${message.text}`,
    );
  }
}
