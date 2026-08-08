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
