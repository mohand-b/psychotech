import { Sector } from '../enums';

export interface UserProfileDto {
  id: string;
  email: string;
  displayName: string;
  locale: string;
  timezone: string;
  currentSector: Sector;
  createdAt: string;
}

export interface UpdateUserProfileDto {
  displayName?: string;
  locale?: string;
  timezone?: string;
  currentSector?: Sector;
}
