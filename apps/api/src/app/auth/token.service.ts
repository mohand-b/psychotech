import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { authConfig } from '../config/auth.config';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(authConfig.KEY)
    private readonly config: ConfigType<typeof authConfig>,
  ) {}

  signAccessToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.accessSecret,
      expiresIn: this.config.accessTtlSeconds,
    });
  }

  signRefreshToken(payload: AccessTokenPayload): Promise<string> {
    return this.jwtService.signAsync(payload, {
      secret: this.config.refreshSecret,
      expiresIn: this.config.refreshTtlSeconds,
    });
  }

  verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.accessSecret,
    });
  }

  verifyRefreshToken(token: string): Promise<AccessTokenPayload> {
    return this.jwtService.verifyAsync<AccessTokenPayload>(token, {
      secret: this.config.refreshSecret,
    });
  }
}
