import { User } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  Inject,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JsonWebTokenError, TokenExpiredError } from '@nestjs/jwt';
import {
  ChangePasswordDto,
  INVALID_CURRENT_PASSWORD_ERROR_CODE,
  LEGAL_TERMS_VERSION,
  LoginDto,
  RegisterDto,
  UserProfileDto,
} from '@psychotech/shared';
import { MailConfig } from '../config/mail.config';
import { toUserProfileDto } from '../users/users.mappers';
import { UsersRepository } from '../users/users.repository';
import { EmailVerificationService } from './email-verification.service';
import { AuthTokens } from './auth.cookie.service';
import { MAILER, MailerPort } from '../mail/mailer.port';
import { buildNoticeEmail } from '../mail/mail-templates';
import { AuthRepository } from './auth.repository';
import { PasswordHasher } from './password.service';
import { AccessTokenPayload, TokenService } from './token.service';

const DEFAULT_TIMEZONE = 'Europe/Paris';
const CSRF_TOKEN_BYTES = 32;

export interface AuthResult {
  user: UserProfileDto;
  tokens: AuthTokens;
  csrfToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly mailConfig: MailConfig;

  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
    private readonly usersRepository: UsersRepository,
    private readonly emailVerification: EmailVerificationService,
    @Inject(MAILER) private readonly mailer: MailerPort,
    configService: ConfigService,
  ) {
    this.mailConfig = configService.getOrThrow<MailConfig>('mail');
  }

  async register(input: RegisterDto): Promise<AuthResult> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    if (!(await this.usersRepository.isSectorActive(input.currentSector))) {
      throw new BadRequestException('The selected sector is not available');
    }
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.repository.createAccount({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      timezone: input.timezone ?? DEFAULT_TIMEZONE,
      locale: input.locale,
      currentSector: input.currentSector,
      termsVersion: LEGAL_TERMS_VERSION,
      termsAcceptedAt: new Date(),
    });
    await this.emailVerification.sendInitialVerification(user);
    return this.issueSession(user);
  }

  async login(input: LoginDto): Promise<AuthResult> {
    const user = await this.repository.findByEmail(input.email);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.passwordHasher.verify(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.repository.markLogin(user.id, new Date());
    return this.issueSession(user);
  }

  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }
    const payload = await this.safeVerifyRefresh(refreshToken);
    if (!payload) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const user = await this.repository.findById(payload.sub);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const matches = await this.passwordHasher.verify(
      user.refreshTokenHash,
      refreshToken,
    );
    if (!matches) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    return this.issueSession(user);
  }

  async changePassword(
    userId: string,
    input: ChangePasswordDto,
  ): Promise<AuthResult> {
    const user = await this.repository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.passwordHasher.verify(
      user.passwordHash,
      input.currentPassword,
    );
    if (!valid) {
      throw new BadRequestException(INVALID_CURRENT_PASSWORD_ERROR_CODE);
    }
    const passwordHash = await this.passwordHasher.hash(input.newPassword);
    await this.repository.updatePasswordHash(user.id, passwordHash);
    this.logger.log(`Password changed for user ${user.id}`);
    await this.sendPasswordChangedNotice(user);
    return this.issueSession(user);
  }

  private async sendPasswordChangedNotice(user: User): Promise<void> {
    try {
      await this.mailer.send({
        to: user.email,
        ...buildNoticeEmail({
          firstName: user.firstName,
          title: 'Votre mot de passe a été modifié',
          paragraphs: [
            'Le mot de passe de votre compte PsychoTech vient d’être modifié. Les autres appareils connectés devront se reconnecter.',
            "Si vous n'êtes pas à l'origine de cette modification, réinitialisez votre mot de passe sans attendre.",
          ],
          baseUrl: this.mailConfig.appBaseUrl ?? 'http://localhost:4200',
        }),
      });
    } catch (error) {
      this.logger.error(
        `Could not send the password change notice to ${user.email}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  async deleteAccount(userId: string, password: string): Promise<void> {
    const user = await this.repository.findById(userId);
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.passwordHasher.verify(user.passwordHash, password);
    if (!valid) {
      throw new BadRequestException(INVALID_CURRENT_PASSWORD_ERROR_CODE);
    }
    await this.repository.deleteUser(userId);
    this.logger.log(`Account deleted for user ${userId} (${user.email})`);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    const payload = await this.safeVerifyRefresh(refreshToken);
    if (payload) {
      await this.repository.updateRefreshTokenHash(payload.sub, null);
    }
  }

  private async issueSession(user: User): Promise<AuthResult> {
    const payload: AccessTokenPayload = { sub: user.id, email: user.email };
    const [accessToken, refreshToken] = await Promise.all([
      this.tokenService.signAccessToken(payload),
      this.tokenService.signRefreshToken(payload),
    ]);
    const refreshTokenHash = await this.passwordHasher.hash(refreshToken);
    await this.repository.updateRefreshTokenHash(user.id, refreshTokenHash);
    return {
      user: toUserProfileDto(user),
      tokens: { accessToken, refreshToken },
      csrfToken: randomBytes(CSRF_TOKEN_BYTES).toString('hex'),
    };
  }

  private async safeVerifyRefresh(
    token: string,
  ): Promise<AccessTokenPayload | null> {
    try {
      return await this.tokenService.verifyRefreshToken(token);
    } catch (error) {
      if (
        !(error instanceof TokenExpiredError) &&
        !(error instanceof JsonWebTokenError)
      ) {
        this.logger.error('Unexpected refresh token verification error', error);
      }
      return null;
    }
  }
}
