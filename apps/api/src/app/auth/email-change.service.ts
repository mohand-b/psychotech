import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import {
  EmailChangeRequestResponseDto,
  VerifyEmailChangeResponseDto,
} from '@psychotech/shared';
import { MailConfig } from '../config/mail.config';
import { MAILER, MailerPort } from '../mail/mailer.port';
import { buildNoticeEmail, buildVerificationEmail } from '../mail/mail-templates';
import { AuthRepository } from './auth.repository';
import { EmailChangeRepository } from './email-change.repository';

const TOKEN_BYTES = 32;
const TOKEN_TTL_HOURS = 24;
const RESEND_MIN_INTERVAL_SECONDS = 60;
const RESEND_WINDOW_HOURS = 24;
const RESEND_WINDOW_LIMIT = 5;
const MS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;

export const EMAIL_TAKEN_ERROR_CODE = 'EMAIL_TAKEN';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class EmailChangeService {
  private readonly logger = new Logger(EmailChangeService.name);
  private readonly config: MailConfig;

  constructor(
    private readonly repository: EmailChangeRepository,
    private readonly authRepository: AuthRepository,
    @Inject(MAILER) private readonly mailer: MailerPort,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<MailConfig>('mail');
  }

  async request(
    userId: string,
    rawNewEmail: string,
  ): Promise<EmailChangeRequestResponseDto> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const newEmail = normalizeEmail(rawNewEmail);
    if (newEmail === normalizeEmail(user.email)) {
      throw new BadRequestException(
        'The new address must differ from the current one',
      );
    }
    const holder = await this.authRepository.findByEmail(newEmail);
    if (holder && holder.id !== userId) {
      throw new BadRequestException(EMAIL_TAKEN_ERROR_CODE);
    }
    const existing = await this.repository.findByUserId(userId);
    if (existing && existing.usedAt === null) {
      const now = Date.now();
      const sinceLastSend =
        (now - existing.lastSentAt.getTime()) / MS_PER_SECOND;
      if (sinceLastSend < RESEND_MIN_INTERVAL_SECONDS) {
        return {
          sent: false,
          retryAfterSeconds: Math.ceil(
            RESEND_MIN_INTERVAL_SECONDS - sinceLastSend,
          ),
          pendingEmail: existing.newEmail,
        };
      }
      const windowSeconds = RESEND_WINDOW_HOURS * SECONDS_PER_HOUR;
      if (
        existing.sentCount >= RESEND_WINDOW_LIMIT &&
        sinceLastSend < windowSeconds
      ) {
        return {
          sent: false,
          retryAfterSeconds: Math.ceil(windowSeconds - sinceLastSend),
          pendingEmail: existing.newEmail,
        };
      }
    }
    await this.issueAndSend(user, newEmail);
    this.logger.log(
      `Email change requested for user ${user.id} towards ${newEmail}`,
    );
    return { sent: true, retryAfterSeconds: null, pendingEmail: newEmail };
  }

  async verify(token: string): Promise<VerifyEmailChangeResponseDto> {
    const record = await this.repository.findByTokenHash(this.hash(token));
    if (!record) {
      return { outcome: 'INVALID', email: null };
    }
    if (record.usedAt !== null) {
      return { outcome: 'ALREADY_USED', email: null };
    }
    const now = new Date();
    if (record.expiresAt.getTime() < now.getTime()) {
      return { outcome: 'EXPIRED', email: null };
    }
    const user = await this.authRepository.findById(record.userId);
    if (!user) {
      return { outcome: 'INVALID', email: null };
    }
    const applied = await this.repository.consumeAndSwap(
      record.id,
      record.userId,
      record.newEmail,
      now,
    );
    if (applied === 'ALREADY_USED') {
      return { outcome: 'ALREADY_USED', email: null };
    }
    if (applied === 'EMAIL_TAKEN') {
      return { outcome: 'INVALID', email: null };
    }
    this.logger.log(
      `Email changed for user ${record.userId}: ${user.email} -> ${record.newEmail}`,
    );
    await this.sendSafely(user.email, {
      firstName: user.firstName,
      title: 'Votre adresse email a été modifiée',
      paragraphs: [
        `L'adresse de connexion de votre compte PsychoTech est désormais ${record.newEmail}.`,
        "Si vous n'êtes pas à l'origine de ce changement, contactez-nous immédiatement en répondant à cet email.",
      ],
    });
    return { outcome: 'CHANGED', email: record.newEmail };
  }

  private async issueAndSend(user: User, newEmail: string): Promise<void> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + TOKEN_TTL_HOURS * SECONDS_PER_HOUR * MS_PER_SECOND,
    );
    await this.repository.replaceRequest(
      user.id,
      newEmail,
      this.hash(token),
      expiresAt,
      now,
    );
    await this.authRepository.setPendingEmail(user.id, newEmail);
    const link = `${this.appBaseUrl()}/verification-changement?token=${token}`;
    const verification = buildVerificationEmail({
      firstName: user.firstName,
      email: newEmail,
      link,
      variant: 'email-change',
    });
    await this.mailer.send({ to: newEmail, ...verification });
    await this.sendSafely(user.email, {
      firstName: user.firstName,
      title: 'Demande de changement d’adresse email',
      paragraphs: [
        `Un changement d'adresse vers ${newEmail} vient d'être demandé pour votre compte PsychoTech. Votre adresse actuelle reste active tant que la nouvelle n'est pas confirmée.`,
        "Si vous n'êtes pas à l'origine de cette demande, modifiez votre mot de passe sans attendre.",
      ],
    });
  }

  private async sendSafely(
    to: string,
    notice: Parameters<typeof buildNoticeEmail>[0],
  ): Promise<void> {
    try {
      await this.mailer.send({ to, ...buildNoticeEmail(notice) });
    } catch (error) {
      this.logger.error(
        `Could not send the security notice to ${to}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private appBaseUrl(): string {
    return this.config.appBaseUrl ?? 'http://localhost:4200';
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
