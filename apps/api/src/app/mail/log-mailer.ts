import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { MailMessage, MailerPort } from './mailer.port';

const PREVIEW_DIR = join(process.cwd(), 'tmp', 'mail');

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class LogMailer implements MailerPort {
  private readonly logger = new Logger('Mailer');

  async send(message: MailMessage): Promise<void> {
    this.logger.log(
      `Email to ${message.to} — ${message.subject}\n${message.text}`,
    );
    try {
      await mkdir(PREVIEW_DIR, { recursive: true });
      const path = join(
        PREVIEW_DIR,
        `${slugify(message.to)}-${slugify(message.subject)}.html`,
      );
      await writeFile(path, message.html, 'utf8');
      this.logger.log(`Rendu HTML déposé dans ${path}`);
    } catch {
      this.logger.warn('Could not write the mail preview file');
    }
  }
}
