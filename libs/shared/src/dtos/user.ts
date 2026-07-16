import { Sector, SubscriptionTier } from '../enums';
import { SubscriptionDto } from './subscription';

export interface UserProfileDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  locale: string;
  timezone: string;
  currentSector: Sector;
  tier: SubscriptionTier;
  subscription: SubscriptionDto | null;
  createdAt: string;
}

export interface UpdateUserProfileDto {
  firstName?: string;
  lastName?: string;
  locale?: string;
  timezone?: string;
  currentSector?: Sector;
}
