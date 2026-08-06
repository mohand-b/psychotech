import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ResendVerificationResponseDto,
  UserProfileDto,
  VerifyEmailResponseDto,
} from '@psychotech/shared';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/current-user.decorator';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
import { AuthCookieService } from './auth.cookie.service';
import { AuthResult, AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { SkipCsrf } from './decorators/skip-csrf.decorator';
import { ChangePasswordRequest } from './dto/change-password.request';
import { LoginRequest } from './dto/login.request';
import { RegisterRequest } from './dto/register.request';
import { VerifyEmailRequest } from './dto/verify-email.request';
import { EmailVerificationService } from './email-verification.service';
import { IpRateLimitService } from './ip-rate-limit.service';

const VERIFY_IP_LIMIT = { limit: 30, windowMs: 3_600_000 };
const RESEND_IP_LIMIT = { limit: 10, windowMs: 3_600_000 };

interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookies: AuthCookieService,
    private readonly emailVerification: EmailVerificationService,
    private readonly ipRateLimit: IpRateLimitService,
  ) {}

  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @Post('email/verify')
  verifyEmail(
    @Body() request: VerifyEmailRequest,
    @Ip() ip: string,
  ): Promise<VerifyEmailResponseDto> {
    this.ipRateLimit.assertAllowed(`verify:${ip}`, VERIFY_IP_LIMIT);
    return this.emailVerification.verify(request.token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('email/resend')
  resendVerification(
    @CurrentUser() userId: string,
    @Ip() ip: string,
  ): Promise<ResendVerificationResponseDto> {
    this.ipRateLimit.assertAllowed(`resend:${ip}`, RESEND_IP_LIMIT);
    return this.emailVerification.resend(userId);
  }

  @Public()
  @SkipCsrf()
  @Post('register')
  async register(
    @Body() request: RegisterRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserProfileDto> {
    return this.completeSession(await this.authService.register(request), response);
  }

  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() request: LoginRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserProfileDto> {
    return this.completeSession(await this.authService.login(request), response);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserProfileDto> {
    return this.completeSession(
      await this.authService.refresh(request.cookies[REFRESH_TOKEN_COOKIE]),
      response,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('password')
  async changePassword(
    @CurrentUser() userId: string,
    @Body() request: ChangePasswordRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserProfileDto> {
    return this.completeSession(
      await this.authService.changePassword(userId, request),
      response,
    );
  }

  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  async logout(
    @Req() request: RequestWithCookies,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(request.cookies[REFRESH_TOKEN_COOKIE]);
    this.cookies.clearAuthCookies(response);
  }

  private completeSession(result: AuthResult, response: Response): UserProfileDto {
    this.cookies.setAuthCookies(response, result.tokens);
    this.cookies.setCsrfCookie(response, result.csrfToken);
    return result.user;
  }
}
