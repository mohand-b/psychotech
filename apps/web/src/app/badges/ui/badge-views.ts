import { BadgeId } from '@psychotech/shared';

export interface BadgeConditionView {
  label: string;
  met: boolean;
}

export interface BadgeTierStepView {
  badgeId: BadgeId;
  assetPath: string;
  earned: boolean;
  next: boolean;
  tierLine: string;
  gain: number | null;
  tierColorVar: string;
  name: string | null;
  sub: string | null;
  conditions: BadgeConditionView[] | null;
  conditionsIntro: string | null;
}

export interface BadgeHeroView {
  assetPath: string;
  locked: boolean;
  name: string | null;
  tierName: string | null;
  tierColorVar: string | null;
  dateLabel: string | null;
  noneYet: boolean;
  rarityLabel: string | null;
}

export interface TieredBadgeCardView {
  label: string;
  hero: BadgeHeroView;
  steps: BadgeTierStepView[];
}

export interface TransverseBadgeView {
  badgeId: BadgeId;
  assetPath: string;
  locked: boolean;
  name: string | null;
  gain: number | null;
  earnedLine: string | null;
  conditionLine: string | null;
  conditions: BadgeConditionView[] | null;
  conditionsIntro: string | null;
  rarityLabel: string | null;
}
