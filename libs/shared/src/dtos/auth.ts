import { Sector } from '../enums';
import { EarnedBadgeDto } from './badge';

export interface RegisterDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  currentSector: Sector;
  locale?: string;
  timezone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailRequestDto {
  token: string;
}

export type EmailVerificationOutcome =
  | 'VERIFIED'
  | 'ALREADY_VERIFIED'
  | 'INVALID'
  | 'EXPIRED';

export interface VerifyEmailResponseDto {
  outcome: EmailVerificationOutcome;
  email: string | null;
  newBadges?: EarnedBadgeDto[];
}

export interface ResendVerificationResponseDto {
  sent: boolean;
  retryAfterSeconds: number | null;
}

export interface RequestPasswordResetDto {
  email: string;
}

export interface RequestPasswordResetResponseDto {
  accepted: true;
}

export type PasswordResetTokenOutcome =
  | 'VALID'
  | 'INVALID'
  | 'EXPIRED'
  | 'ALREADY_USED';

export interface PasswordResetTokenCheckDto {
  outcome: PasswordResetTokenOutcome;
  email: string | null;
  definesFirstPassword: boolean;
}

export type PasswordResetOutcome =
  | 'RESET'
  | 'INVALID'
  | 'EXPIRED'
  | 'ALREADY_USED';

export interface ResetPasswordDto {
  token: string;
  password: string;
}

export interface ResetPasswordResponseDto {
  outcome: PasswordResetOutcome;
}
