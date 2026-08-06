import { HttpErrorResponse } from '@angular/common/http';
import { EMAIL_NOT_VERIFIED_ERROR_CODE } from '@psychotech/shared';

export function isEmailNotVerifiedError(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    error.status === 403 &&
    (error.error as { message?: string } | null)?.message ===
      EMAIL_NOT_VERIFIED_ERROR_CODE
  );
}
