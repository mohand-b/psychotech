import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import { SsoErrorCode, SsoOrigin, isSafeReturnUrl } from '@psychotech/shared';
import { Request, Response } from 'express';
import { GOOGLE_STATE_COOKIE } from '../auth.constants';
import { AuthCookieService } from '../auth.cookie.service';
import { AuthService } from '../auth.service';
import { Public } from '../decorators/public.decorator';
import { GoogleStartRequest } from './dto/google-start.request';
import { GoogleOAuthError } from './google-oauth.error';
import { GoogleOAuthService } from './google-oauth.service';

interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>;
}

@Controller('auth/google')
export class GoogleOAuthController {
  private readonly logger = new Logger(GoogleOAuthController.name);

  constructor(
    private readonly googleOAuth: GoogleOAuthService,
    private readonly authService: AuthService,
    private readonly cookies: AuthCookieService,
  ) {}

  @Public()
  @Get('start')
  async start(
    @Query() query: GoogleStartRequest,
    @Res() response: Response,
  ): Promise<void> {
    const from: SsoOrigin = query.from ?? 'login';
    if (!this.googleOAuth.enabled) {
      response.redirect(this.googleOAuth.errorUrl(from, 'GOOGLE_UNAVAILABLE'));
      return;
    }
    const returnUrl =
      query.returnUrl !== undefined && isSafeReturnUrl(query.returnUrl)
        ? query.returnUrl
        : undefined;
    const start = await this.googleOAuth.createStart({
      from,
      returnUrl,
      sector: query.sector,
    });
    this.cookies.setGoogleStateCookie(response, start.stateToken);
    response.redirect(start.url);
  }

  @Public()
  @Get('callback')
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Req() request: RequestWithCookies,
    @Res() response: Response,
  ): Promise<void> {
    const stateToken = request.cookies[GOOGLE_STATE_COOKIE];
    this.cookies.clearGoogleStateCookie(response);
    let from: SsoOrigin = 'login';
    try {
      const statePayload = await this.googleOAuth.readState(stateToken);
      from = statePayload.from;
      const claims = await this.googleOAuth.exchange(
        { code, state, error },
        statePayload,
      );
      const result = await this.authService.googleSignIn(claims, {
        sector: statePayload.sector,
      });
      this.cookies.setAuthCookies(response, result.tokens);
      this.cookies.setCsrfCookie(response, result.csrfToken);
      response.redirect(
        result.user.emailVerifiedAt === null
          ? this.googleOAuth.verificationPendingUrl()
          : this.googleOAuth.landingUrl(statePayload.returnUrl),
      );
    } catch (caught) {
      response.redirect(this.googleOAuth.errorUrl(from, this.toErrorCode(caught)));
    }
  }

  private toErrorCode(caught: unknown): SsoErrorCode {
    if (caught instanceof GoogleOAuthError) {
      return caught.code;
    }
    this.logger.error(
      'Unexpected Google callback failure',
      caught instanceof Error ? caught.stack : String(caught),
    );
    return 'GOOGLE_FAILED';
  }
}
