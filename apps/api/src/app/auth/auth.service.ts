import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { LoginDto, RegisterDto, UserProfileDto } from '@psychotech/shared';
import { toUserProfileDto } from '../users/users.mappers';
import { AuthTokens } from './auth.cookie.service';
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
  constructor(
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResult> {
    const existing = await this.repository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.repository.createAccount({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      timezone: input.timezone ?? DEFAULT_TIMEZONE,
      locale: input.locale,
    });
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
    } catch {
      return null;
    }
  }
}
