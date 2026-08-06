import { BadgeId } from '../domain/badges/badge-model';

export interface BadgeConditionStateDto {
  id: string;
  label: string;
  met: boolean;
}

export interface BadgeStatusDto {
  badgeId: BadgeId;
  earnedAt: string | null;
  acknowledgedAt: string | null;
  conditions: BadgeConditionStateDto[];
  rarityPercent: number | null;
}

export interface NewBadgeDto {
  badgeId: BadgeId;
  energyReward: number;
}

export interface UnacknowledgedBadgeDto {
  badgeId: BadgeId;
  earnedAt: string;
  energyReward: number;
}
