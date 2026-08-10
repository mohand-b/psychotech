import { HttpErrorResponse } from '@angular/common/http';

export function isTechnicalHttpError(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    (error.status === 0 || error.status >= 500)
  );
}
