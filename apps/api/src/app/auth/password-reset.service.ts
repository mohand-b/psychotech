import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import {
  PASSWORD_RESET_TTL_MINUTES,
  PasswordResetTokenCheckDto,
  RequestPasswordResetResponseDto,
  ResetPasswordResponseDto,
} from '@psychotech/shared';
import { MailConfig } from '../config/mail.config';
import { MAILER, MailerPort } from '../mail/mailer.port';
import {
  buildNoticeEmail,
  buildPasswordResetEmail,
} from '../mail/mail-templates';
import { AuthRepository } from './auth.repository';
import { normalizeEmail } from './email-normalization';
import { PasswordResetRepository } from './password-reset.repository';
import { PasswordHasher } from './password.service';
import { resendRetryAfterSeconds } from './resend-throttle';

const PASSWORD_RESET_WINDOW_HOURS = 1;
const TOKEN_BYTES = 32;
const MS_PER_MINUTE = 60_000;
const DEFAULT_APP_BASE_URL = 'http://localhost:4200';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly config: MailConfig;

  constructor(
    private readonly repository: PasswordResetRepository,
    private readonly authRepository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    @Inject(MAILER) private readonly mailer: MailerPort,
    configService: ConfigService,
  ) {
    this.config = configService.getOrThrow<MailConfig>('mail');
  }

  request(rawEmail: string): RequestPasswordResetResponseDto {
    void this.deliverResetLink(normalizeEmail(rawEmail));
    return { accepted: true };
  }

  async deliverResetLink(email: string): Promise<void> {
    try {
      const user = await this.authRepository.findByEmailInsensitive(email);
      if (!user) {
        return;
      }
      const existing = await this.repository.findByUserId(user.id);
      const now = new Date();
      if (
        existing &&
        resendRetryAfterSeconds(existing, now, PASSWORD_RESET_WINDOW_HOURS) !==
          null
      ) {
        return;
      }
      const token = randomBytes(TOKEN_BYTES).toString('hex');
      const expiresAt = new Date(
        now.getTime() + PASSWORD_RESET_TTL_MINUTES * MS_PER_MINUTE,
      );
      await this.repository.replaceRequest(
        user.id,
        this.hash(token),
        expiresAt,
        now,
      );
      await this.mailer.send({
        to: user.email,
        ...buildPasswordResetEmail({
          firstName: user.firstName,
          email: user.email,
          link: `${this.appBaseUrl()}/nouveau-mot-de-passe?token=${token}`,
          variant: user.passwordHash === null ? 'define' : 'reset',
          baseUrl: this.appBaseUrl(),
        }),
      });
    } catch (error) {
      this.logger.error(
        'Could not deliver the password reset link',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async check(token: string): Promise<PasswordResetTokenCheckDto> {
    const record = await this.repository.findByTokenHash(this.hash(token));
    if (!record) {
      return { outcome: 'INVALID', email: null, definesFirstPassword: false };
    }
    if (record.usedAt !== null) {
      return {
        outcome: 'ALREADY_USED',
        email: null,
        definesFirstPassword: false,
      };
    }
    if (record.expiresAt.getTime() < Date.now()) {
      return { outcome: 'EXPIRED', email: null, definesFirstPassword: false };
    }
    const user = await this.authRepository.findById(record.userId);
    if (!user) {
      return { outcome: 'INVALID', email: null, definesFirstPassword: false };
    }
    return {
      outcome: 'VALID',
      email: user.email,
      definesFirstPassword: user.passwordHash === null,
    };
  }

  async reset(
    token: string,
    password: string,
  ): Promise<ResetPasswordResponseDto> {
    const record = await this.repository.findByTokenHash(this.hash(token));
    if (!record) {
      return { outcome: 'INVALID' };
    }
    if (record.usedAt !== null) {
      return { outcome: 'ALREADY_USED' };
    }
    const now = new Date();
    if (record.expiresAt.getTime() < now.getTime()) {
      return { outcome: 'EXPIRED' };
    }
    const user = await this.authRepository.findById(record.userId);
    if (!user) {
      return { outcome: 'INVALID' };
    }
    const definedFirstPassword = user.passwordHash === null;
    const passwordHash = await this.passwordHasher.hash(password);
    const outcome = await this.repository.consumeAndSetPassword(
      record.id,
      record.userId,
      passwordHash,
      now,
    );
    if (outcome === 'ALREADY_USED') {
      return { outcome: 'ALREADY_USED' };
    }
    this.logger.log(`Password reset completed for user ${user.id}`);
    await this.sendSecurityNotice(user, definedFirstPassword);
    return { outcome: 'RESET' };
  }

  private async sendSecurityNotice(
    user: User,
    definedFirstPassword: boolean,
  ): Promise<void> {
    try {
      await this.mailer.send({
        to: user.email,
        ...buildNoticeEmail({
          firstName: user.firstName,
          title: definedFirstPassword
            ? 'Votre mot de passe a été défini'
            : 'Votre mot de passe a été modifié',
          paragraphs: [
            definedFirstPassword
              ? 'Vous pouvez désormais vous connecter à PsychoTech avec votre adresse email et ce mot de passe, ou continuer avec Google. Tous vos appareils ont été déconnectés.'
              : 'Le mot de passe de votre compte PsychoTech vient d’être réinitialisé. Tous vos appareils ont été déconnectés.',
            "Si vous n'êtes pas à l'origine de cette demande, réinitialisez votre mot de passe sans attendre et contactez-nous.",
          ],
          baseUrl: this.appBaseUrl(),
        }),
      });
    } catch (error) {
      this.logger.error(
        `Could not send the password reset notice to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private appBaseUrl(): string {
    return this.config.appBaseUrl ?? DEFAULT_APP_BASE_URL;
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
