import { SsoErrorCode } from '@psychotech/shared';

export class GoogleOAuthError extends Error {
  constructor(
    readonly code: SsoErrorCode,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'GoogleOAuthError';
  }
}
