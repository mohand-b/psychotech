import { HttpErrorResponse } from '@angular/common/http';
import { ENERGY_INSUFFICIENT_ERROR_CODE } from '@psychotech/shared';

export function isEnergyInsufficientError(error: unknown): boolean {
  return (
    error instanceof HttpErrorResponse &&
    (error.error as { message?: string } | null)?.message ===
      ENERGY_INSUFFICIENT_ERROR_CODE
  );
}
