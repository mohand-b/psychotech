import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthCookieService } from './auth.cookie.service';
import { AuthRepository } from './auth.repository';
import { AuthService } from './auth.service';
import { CsrfGuard } from './guards/csrf.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PasswordHasher } from './password.service';
import { TokenService } from './token.service';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    PasswordHasher,
    TokenService,
    AuthCookieService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
  ],
  exports: [TokenService],
})
export class AuthModule {}
