import { ErrorHandler, Injectable } from '@angular/core';
import { isStaleChunkError, reloadOnceForStaleChunk } from './stale-chunk';

@Injectable()
export class StaleChunkErrorHandler extends ErrorHandler {
  override handleError(error: unknown): void {
    const unwrapped =
      (error as { rejection?: unknown } | null)?.rejection ?? error;
    if (isStaleChunkError(unwrapped) && reloadOnceForStaleChunk()) {
      return;
    }
    super.handleError(error);
  }
}
