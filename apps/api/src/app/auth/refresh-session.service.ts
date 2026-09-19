import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { RefreshSession } from '@prisma/client';
import { authConfig } from '../config/auth.config';
import { RefreshSessionRepository } from './refresh-session.repository';
import {
  AccessTokenPayload,
  RefreshTokenPayload,
  TokenService,
} from './token.service';

export const REFRESH_ROTATION_MIN_AGE_SECONDS = 86_400;
export const REFRESH_REUSE_GRACE_SECONDS = 300;
const MILLISECONDS_PER_SECOND = 1000;

type BoundRefreshTokenPayload = RefreshTokenPayload & { sid: string };

@Injectable()
export class RefreshSessionService {
  constructor(
    private readonly repository: RefreshSessionRepository,
    private readonly tokenService: TokenService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  async open(identity: AccessTokenPayload, now = new Date()): Promise<string> {
    const id = randomUUID();
    const refreshToken = await this.tokenService.signRefreshToken({
      ...identity,
      sid: id,
    });
    await this.repository.deleteExpired(identity.sub, now);
    await this.repository.create({
      id,
      userId: identity.sub,
      tokenHash: this.hash(refreshToken),
      expiresAt: this.expiryFrom(now),
    });
    return refreshToken;
  }

  async renew(
    payload: BoundRefreshTokenPayload,
    presentedToken: string,
    now = new Date(),
  ): Promise<string | null> {
    const session = await this.repository.findById(payload.sid);
    if (
      !session ||
      session.userId !== payload.sub ||
      session.expiresAt.getTime() <= now.getTime()
    ) {
      return null;
    }
    const presentedHash = this.hash(presentedToken);
    if (presentedHash === session.tokenHash) {
      if (session.previousTokenHash !== null) {
        await this.repository.confirmSuccessor(session.id);
      }
      return this.isYoung(payload, now)
        ? presentedToken
        : this.rotate(session, payload, presentedHash, now);
    }
    if (presentedHash === session.previousTokenHash) {
      return this.rotatedWithinGrace(session, now)
        ? presentedToken
        : this.rotate(session, payload, presentedHash, now);
    }
    return null;
  }

  close(sessionId: string, userId: string): Promise<void> {
    return this.repository.close(sessionId, userId);
  }

  closeAll(userId: string): Promise<void> {
    return this.repository.closeAll(userId);
  }

  private async rotate(
    session: RefreshSession,
    payload: BoundRefreshTokenPayload,
    presentedHash: string,
    now: Date,
  ): Promise<string> {
    const refreshToken = await this.tokenService.signRefreshToken({
      sub: payload.sub,
      email: payload.email,
      sid: session.id,
    });
    await this.repository.rotate(session.id, {
      tokenHash: this.hash(refreshToken),
      previousTokenHash: presentedHash,
      rotatedAt: now,
      expiresAt: this.expiryFrom(now),
    });
    return refreshToken;
  }

  private isYoung(payload: RefreshTokenPayload, now: Date): boolean {
    return (
      payload.iat !== undefined &&
      now.getTime() / MILLISECONDS_PER_SECOND - payload.iat <
        REFRESH_ROTATION_MIN_AGE_SECONDS
    );
  }

  private rotatedWithinGrace(session: RefreshSession, now: Date): boolean {
    return (
      now.getTime() - session.rotatedAt.getTime() <
      REFRESH_REUSE_GRACE_SECONDS * MILLISECONDS_PER_SECOND
    );
  }

  private expiryFrom(now: Date): Date {
    return new Date(
      now.getTime() + this.config.refreshTtlSeconds * MILLISECONDS_PER_SECOND,
    );
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
