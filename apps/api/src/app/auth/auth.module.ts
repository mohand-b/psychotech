import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthCookieService } from './auth.cookie.service';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { EmailVerificationRepository } from './email-verification.repository';
import { EmailVerificationService } from './email-verification.service';
import { CsrfGuard } from './guards/csrf.guard';
import { IpRateLimitService } from './ip-rate-limit.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordHasher } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({}), UsersModule, MailModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    EmailVerificationService,
    EmailVerificationRepository,
    IpRateLimitService,
    PasswordHasher,
    TokenService,
    AuthCookieService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [TokenService],
})
export class AuthModule {}
