import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ACCESS_TOKEN_COOKIE } from '../auth.constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../token.service';

interface AuthenticatedRequest extends Request {
  cookies: Record<string, string | undefined>;
  user?: { id: string; email: string };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies[ACCESS_TOKEN_COOKIE];
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      const payload = await this.tokenService.verifyAccessToken(token);
      request.user = { id: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
