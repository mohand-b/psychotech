import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UseInterceptors,
} from '@nestjs/common';
import {
  EmailChangeRequestResponseDto,
  PasswordResetTokenCheckDto,
  RequestPasswordResetResponseDto,
  ResendVerificationResponseDto,
  ResetPasswordResponseDto,
  UserProfileDto,
  VerifyEmailChangeResponseDto,
  VerifyEmailResponseDto,
} from '@psychotech/shared';
import { Request, Response } from 'express';
import { NewBadgesInterceptor } from '../badges/new-badges.interceptor';
import { CurrentUser } from '../common/current-user.decorator';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
import { AuthCookieService } from './auth.cookie.service';
import { AuthResult, AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { SkipCsrf } from './decorators/skip-csrf.decorator';
import { ChangePasswordRequest } from './dto/change-password.request';
import { LoginRequest } from './dto/login.request';
import { RegisterRequest } from './dto/register.request';
import { DeleteAccountRequest } from './dto/delete-account.request';
import { RequestEmailChangeRequest } from './dto/request-email-change.request';
import { VerifyEmailChangeRequest } from './dto/verify-email-change.request';
import { VerifyEmailRequest } from './dto/verify-email.request';
import { CheckPasswordResetRequest } from './dto/check-password-reset.request';
import { RequestPasswordResetRequest } from './dto/request-password-reset.request';
import { ResetPasswordRequest } from './dto/reset-password.request';
import { EmailChangeService } from './email-change.service';
import { EmailVerificationService } from './email-verification.service';
import { IpRateLimitService } from './ip-rate-limit.service';
import { normalizeEmail } from './email-normalization';
import { PasswordResetService } from './password-reset.service';

const VERIFY_IP_LIMIT = { limit: 30, windowMs: 3_600_000 };
const RESEND_IP_LIMIT = { limit: 10, windowMs: 3_600_000 };
const EMAIL_CHANGE_LIMIT = { limit: 10, windowMs: 3_600_000 };
const DELETE_LIMIT = { limit: 5, windowMs: 3_600_000 };
const FORGOT_IP_LIMIT = { limit: 10, windowMs: 3_600_000 };
const FORGOT_EMAIL_LIMIT = { limit: 5, windowMs: 86_400_000 };
const RESET_IP_LIMIT = { limit: 30, windowMs: 3_600_000 };

interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookies: AuthCookieService,
    private readonly emailVerification: EmailVerificationService,
    private readonly emailChange: EmailChangeService,
    private readonly passwordReset: PasswordResetService,
    private readonly ipRateLimit: IpRateLimitService,
  ) {}

  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @Post('password/forgot')
  requestPasswordReset(
    @Body() request: RequestPasswordResetRequest,
    @Ip() ip: string,
  ): RequestPasswordResetResponseDto {
    this.ipRateLimit.assertAllowed(`forgot:${ip}`, FORGOT_IP_LIMIT);
    this.ipRateLimit.assertAllowed(
      `forgot:email:${normalizeEmail(request.email)}`,
      FORGOT_EMAIL_LIMIT,
    );
    return this.passwordReset.request(request.email);
  }

  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @Post('password/reset/check')
  checkPasswordReset(
    @Body() request: CheckPasswordResetRequest,
    @Ip() ip: string,
  ): Promise<PasswordResetTokenCheckDto> {
    this.ipRateLimit.assertAllowed(`reset-check:${ip}`, RESET_IP_LIMIT);
    return this.passwordReset.check(request.token);
  }

  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @Post('password/reset')
  resetPassword(
    @Body() request: ResetPasswordRequest,
    @Ip() ip: string,
  ): Promise<ResetPasswordResponseDto> {
    this.ipRateLimit.assertAllowed(`reset:${ip}`, RESET_IP_LIMIT);
    return this.passwordReset.reset(request.token, request.password);
  }

  @Public()
  @SkipCsrf()
  @UseInterceptors(NewBadgesInterceptor)
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

  @HttpCode(HttpStatus.OK)
  @Post('email/change')
  requestEmailChange(
    @CurrentUser() userId: string,
    @Body() request: RequestEmailChangeRequest,
    @Ip() ip: string,
  ): Promise<EmailChangeRequestResponseDto> {
    this.ipRateLimit.assertAllowed(`email-change:${ip}`, EMAIL_CHANGE_LIMIT);
    this.ipRateLimit.assertAllowed(
      `email-change:user:${userId}`,
      EMAIL_CHANGE_LIMIT,
    );
    return this.emailChange.request(userId, request.newEmail);
  }

  @Public()
  @SkipCsrf()
  @HttpCode(HttpStatus.OK)
  @Post('email/change/verify')
  verifyEmailChange(
    @Body() request: VerifyEmailChangeRequest,
    @Ip() ip: string,
  ): Promise<VerifyEmailChangeResponseDto> {
    this.ipRateLimit.assertAllowed(`verify-change:${ip}`, VERIFY_IP_LIMIT);
    return this.emailChange.verify(request.token);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('account/delete')
  async deleteAccount(
    @CurrentUser() userId: string,
    @Body() request: DeleteAccountRequest,
    @Ip() ip: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    this.ipRateLimit.assertAllowed(`delete:${ip}`, DELETE_LIMIT);
    await this.authService.deleteAccount(userId, request.password);
    this.cookies.clearAuthCookies(response);
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
