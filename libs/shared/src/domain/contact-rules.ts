import { ContactProblemLocation, ContactReason } from '../enums/contact-reason';

export const CONTACT_EMAIL_MAX_LENGTH = 254;
export const CONTACT_SUBJECT_MAX_LENGTH = 120;
export const CONTACT_MESSAGE_MIN_LENGTH = 10;
export const CONTACT_MESSAGE_MAX_LENGTH = 1500;
export const CONTACT_PAGE_URL_MAX_LENGTH = 300;
export const CONTACT_USER_AGENT_MAX_LENGTH = 400;
export const CONTACT_VIEWPORT_PATTERN = /^\d{2,5}x\d{2,5}$/;
export const CONTACT_MIN_FILL_SECONDS = 3;
export const CONTACT_FORM_TOKEN_TTL_HOURS = 24;
export const CONTACT_HONEYPOT_FIELD = 'website';
export const CONTACT_SCREENSHOT_MAX_BYTES = 1_500_000;
export const CONTACT_SCREENSHOT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const CONTACT_TOO_FAST_ERROR_CODE = 'CONTACT_TOO_FAST';
export const CONTACT_FORM_EXPIRED_ERROR_CODE = 'CONTACT_FORM_EXPIRED';

export function isProblemReason(reason: ContactReason): boolean {
  return (
    reason === ContactReason.BUG_REPORT ||
    reason === ContactReason.PAYMENT_ISSUE
  );
}

export function problemReasonFor(
  location: ContactProblemLocation,
): ContactReason {
  return location === ContactProblemLocation.CREDITS_OR_PAYMENT
    ? ContactReason.PAYMENT_ISSUE
    : ContactReason.BUG_REPORT;
}
