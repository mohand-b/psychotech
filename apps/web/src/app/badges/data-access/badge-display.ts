import {
  BADGE_BY_ID,
  BadgeId,
  Sector,
  badgeAssetPath,
  badgeDisplayName,
} from '@psychotech/shared';
import { BadgeRevealView } from '../../shared/ui/badge-unlock/badge-unlock';

export function energyGainLabel(energyReward: number): string | null {
  if (energyReward <= 0) {
    return null;
  }
  return energyReward === 1 ? '+1 énergie' : `+${energyReward} énergies`;
}

export function badgeRevealViewFor(
  badgeId: BadgeId,
  energyReward: number,
  sector: Sector,
): BadgeRevealView | null {
  const definition = BADGE_BY_ID.get(badgeId);
  if (!definition) {
    return null;
  }
  return {
    badgeId,
    name: badgeDisplayName(definition, sector),
    assetPath: badgeAssetPath(definition, sector),
    gainLabel: energyGainLabel(energyReward),
  };
}
