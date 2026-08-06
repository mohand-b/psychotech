import { ServiceUnavailableException } from '@nestjs/common';
import { MailMessage, MailerPort } from './mailer.port';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export class ResendMailer implements MailerPort {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: MailMessage): Promise<void> {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Resend rejected the email (${response.status})`,
      );
    }
  }
}
