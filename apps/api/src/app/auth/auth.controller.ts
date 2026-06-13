import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { UserProfileDto } from '@psychotech/shared';
import { Request, Response } from 'express';
import { REFRESH_TOKEN_COOKIE } from './auth.constants';
import { AuthCookieService } from './auth.cookie.service';
import { AuthResult, AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { SkipCsrf } from './decorators/skip-csrf.decorator';
import { LoginRequest } from './dto/login.request';
import { RegisterRequest } from './dto/register.request';

interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

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
