import { Sector } from '../enums';

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: string;
  timezone: string;
  currentSector: Sector;
  createdAt: string;
}

export interface UpdateUserProfileDto {
  firstName?: string;
  lastName?: string;
  locale?: string;
  timezone?: string;
  currentSector?: Sector;
}
