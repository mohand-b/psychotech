import { BadgeCategory } from '../enums';

export interface BadgeDto {
  code: string;
  name: string;
  description: string;
  category: BadgeCategory;
  icon: string;
}

export interface UserBadgeDto {
  badge: BadgeDto;
  unlockedAt: string;
}
