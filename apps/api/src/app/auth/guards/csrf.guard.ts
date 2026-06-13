import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { CSRF_TOKEN_COOKIE, CSRF_TOKEN_HEADER } from '../auth.constants';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

interface CsrfRequest extends Request {
  cookies: Record<string, string | undefined>;
}

@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<CsrfRequest>();
    if (SAFE_METHODS.includes(request.method)) {
      return true;
    }
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }
    const cookieToken = request.cookies[CSRF_TOKEN_COOKIE];
    const headerToken = request.header(CSRF_TOKEN_HEADER);
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('Invalid CSRF token');
    }
    return true;
  }
}
