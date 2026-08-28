import { Sector } from '../enums';

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: string;
  timezone: string;
  currentSector: Sector;
  showInFeed: boolean;
  emailVerifiedAt: string | null;
  examGuideReadAt: string | null;
  logicGuideReadAt: string | null;
  pendingEmail: string | null;
  passwordChangedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UpdateUserProfileDto {
  firstName?: string;
  lastName?: string;
  locale?: string;
  timezone?: string;
  currentSector?: Sector;
  showInFeed?: boolean;
}

export const DELETE_ACCOUNT_CONFIRMATION = 'SUPPRIMER';

export interface RequestEmailChangeDto {
  newEmail: string;
}

export interface EmailChangeRequestResponseDto {
  sent: boolean;
  retryAfterSeconds: number | null;
  pendingEmail: string | null;
}

export type EmailChangeOutcome =
  | 'CHANGED'
  | 'INVALID'
  | 'EXPIRED'
  | 'ALREADY_USED';

export interface VerifyEmailChangeResponseDto {
  outcome: EmailChangeOutcome;
  email: string | null;
}

export interface DeleteAccountDto {
  password: string;
  confirmation: string;
}
