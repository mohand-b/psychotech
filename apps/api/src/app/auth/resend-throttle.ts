export const RESEND_MIN_INTERVAL_SECONDS = 60;
export const RESEND_WINDOW_HOURS = 24;
export const RESEND_WINDOW_LIMIT = 5;

const MS_PER_SECOND = 1000;
const SECONDS_PER_HOUR = 3600;

export interface ResendCounters {
  sentCount: number;
  lastSentAt: Date;
}

export function resendRetryAfterSeconds(
  counters: ResendCounters,
  now: Date,
  windowHours: number = RESEND_WINDOW_HOURS,
): number | null {
  const sinceLastSend =
    (now.getTime() - counters.lastSentAt.getTime()) / MS_PER_SECOND;
  if (sinceLastSend < RESEND_MIN_INTERVAL_SECONDS) {
    return Math.ceil(RESEND_MIN_INTERVAL_SECONDS - sinceLastSend);
  }
  const windowSeconds = windowHours * SECONDS_PER_HOUR;
  if (counters.sentCount >= RESEND_WINDOW_LIMIT && sinceLastSend < windowSeconds) {
    return Math.ceil(windowSeconds - sinceLastSend);
  }
  return null;
}
