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

export interface EarnedBadgeConditionDto {
  id: string;
  label: string;
  met: boolean;
  justValidated: boolean;
}

export interface EarnedBadgeDto {
  badgeId: BadgeId;
  earnedAt: string;
  gain: number | null;
  conditions: EarnedBadgeConditionDto[];
}

export interface NewBadgesPayload {
  newBadges?: EarnedBadgeDto[];
}
