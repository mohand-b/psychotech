import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import {
  BadgeEvent,
  ResendVerificationResponseDto,
  SIGNUP_ENERGY_GRANT,
  VerifyEmailResponseDto,
} from '@psychotech/shared';
import { BadgesService } from '../badges/badges.service';
import { MailConfig } from '../config/mail.config';
import { MAILER, MailerPort } from '../mail/mailer.port';
import { buildVerificationEmail } from '../mail/mail-templates';
import { AuthRepository } from './auth.repository';
import { EmailVerificationRepository } from './email-verification.repository';

const TOKEN_BYTES = 32;
const TOKEN_TTL_HOURS = 24;
const RESEND_MIN_INTERVAL_SECONDS = 60;
const RESEND_WINDOW_HOURS = 24;
const RESEND_WINDOW_LIMIT = 5;
const MS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly config: MailConfig;

  constructor(
    private readonly repository: EmailVerificationRepository,
    private readonly authRepository: AuthRepository,
    private readonly badgesService: BadgesService,
    @Inject(MAILER) private readonly mailer: MailerPort,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<MailConfig>('mail');
  }

  async sendInitialVerification(user: User): Promise<void> {
    try {
      await this.issueAndSend(user);
    } catch (error) {
      this.logger.error(
        `Could not send the verification email to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async resend(userId: string): Promise<ResendVerificationResponseDto> {
    const user = await this.authRepository.findById(userId);
    if (!user || user.emailVerifiedAt !== null) {
      return { sent: false, retryAfterSeconds: null };
    }
    const existing = await this.repository.findByUserId(userId);
    if (existing) {
      const now = Date.now();
      const sinceLastSend = (now - existing.lastSentAt.getTime()) / MS_PER_SECOND;
      if (sinceLastSend < RESEND_MIN_INTERVAL_SECONDS) {
        return {
          sent: false,
          retryAfterSeconds: Math.ceil(
            RESEND_MIN_INTERVAL_SECONDS - sinceLastSend,
          ),
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
        };
      }
    }
    await this.issueAndSend(user);
    return { sent: true, retryAfterSeconds: null };
  }

  async verify(token: string): Promise<VerifyEmailResponseDto> {
    const record = await this.repository.findByTokenHash(this.hash(token));
    if (!record) {
      return { outcome: 'INVALID', grantedEnergy: 0 };
    }
    if (record.usedAt !== null) {
      return { outcome: 'ALREADY_VERIFIED', grantedEnergy: 0 };
    }
    const now = new Date();
    if (record.expiresAt.getTime() < now.getTime()) {
      return { outcome: 'EXPIRED', grantedEnergy: 0 };
    }
    const outcome = await this.repository.consumeAndGrant(
      record.id,
      record.userId,
      SIGNUP_ENERGY_GRANT,
      now,
      async (client) => {
        await this.badgesService.evaluateWithin(
          client,
          record.userId,
          BadgeEvent.ACCOUNT_VERIFIED,
          null,
        );
      },
    );
    if (outcome === 'VERIFIED_WITH_GRANT') {
      return { outcome: 'VERIFIED', grantedEnergy: SIGNUP_ENERGY_GRANT };
    }
    return { outcome: 'ALREADY_VERIFIED', grantedEnergy: 0 };
  }

  private async issueAndSend(user: User): Promise<void> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + TOKEN_TTL_HOURS * SECONDS_PER_HOUR * MS_PER_SECOND,
    );
    await this.repository.replaceToken(user.id, this.hash(token), expiresAt, now);
    const link = `${this.appBaseUrl()}/verification?token=${token}`;
    const email = buildVerificationEmail({
      firstName: user.firstName,
      email: user.email,
      link,
      variant: 'signup',
    });
    await this.mailer.send({ to: user.email, ...email });
  }

  private appBaseUrl(): string {
    return this.config.appBaseUrl ?? 'http://localhost:4200';
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
