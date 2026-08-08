import {
  AXIS_META,
  BADGE_BY_ID,
  BadgeDefinition,
  BadgeFamily,
  BadgeTier,
  EarnedBadgeDto,
  FULL_SESSION_LABEL_LOWER,
  Sector,
  badgeAssetPath,
  badgeDisplayName,
} from '@psychotech/shared';
import {
  BadgeAnnounceThumb,
  BadgeAnnounceView,
} from '../../shared/ui/badge-announce/badge-announce';
import { BadgeCelebrationView } from '../../shared/ui/badge-celebration-modal/badge-celebration-modal';

const TIER_NAMES: Record<BadgeTier, string> = {
  [BadgeTier.BRONZE]: 'Bronze',
  [BadgeTier.SILVER]: 'Argent',
  [BadgeTier.GOLD]: 'Or',
};

const TIER_COLOR_VARS: Record<BadgeTier, string> = {
  [BadgeTier.BRONZE]: 'var(--badge-bronze)',
  [BadgeTier.SILVER]: 'var(--badge-argent)',
  [BadgeTier.GOLD]: 'var(--badge-or)',
};

export function energyGain(energyReward: number): number | null {
  return energyReward > 0 ? energyReward : null;
}

function familyLabelFor(definition: BadgeDefinition): string {
  switch (definition.family) {
    case BadgeFamily.AXIS:
      return definition.axis
        ? `Badge d'axe · ${AXIS_META[definition.axis].label}`
        : "Badge d'axe";
    case BadgeFamily.EXAM:
      return `Badge d'${FULL_SESSION_LABEL_LOWER}`;
    case BadgeFamily.TRANSVERSE:
      return 'Badge transverse';
  }
}

function tierLineFor(definition: BadgeDefinition): string | null {
  return definition.tier
    ? `${familyLabelFor(definition)} · ${TIER_NAMES[definition.tier]}`
    : familyLabelFor(definition);
}

export function badgeCelebrationViewFor(
  badge: EarnedBadgeDto,
  sector: Sector,
): BadgeCelebrationView | null {
  const definition = BADGE_BY_ID.get(badge.badgeId);
  if (!definition) {
    return null;
  }
  const anyJustValidated = badge.conditions.some(
    (entry) => entry.justValidated,
  );
  const conditions = badge.conditions.map((entry, index) => ({
    label: entry.label,
    justValidated: anyJustValidated ? entry.justValidated : index === 0,
  }));
  return {
    badgeId: badge.badgeId,
    name: badgeDisplayName(definition, sector),
    assetPath: badgeAssetPath(definition, sector),
    familyLabel: familyLabelFor(definition),
    tierName: definition.tier ? TIER_NAMES[definition.tier] : null,
    tierColorVar: definition.tier ? TIER_COLOR_VARS[definition.tier] : null,
    conditions,
    gain: badge.gain,
  };
}

export function badgeAnnounceViewFor(
  badges: EarnedBadgeDto[],
  sector: Sector,
): BadgeAnnounceView | null {
  const definitions = badges.flatMap((badge) => {
    const definition = BADGE_BY_ID.get(badge.badgeId);
    return definition ? [{ badge, definition }] : [];
  });
  if (definitions.length === 0) {
    return null;
  }
  const thumbs: BadgeAnnounceThumb[] = definitions.map(
    ({ definition }) => ({
      assetPath: badgeAssetPath(definition, sector),
      name: badgeDisplayName(definition, sector),
    }),
  );
  const names = thumbs.map((thumb) => thumb.name).join(' et ');
  const totalGain = definitions.reduce(
    (sum, { badge }) => sum + (badge.gain ?? 0),
    0,
  );
  return {
    thumbs,
    title: `${names} ${definitions.length > 1 ? 'rejoignent' : 'rejoint'} votre collection`,
    gain: totalGain > 0 ? totalGain : null,
    plainLine: totalGain > 0 ? null : tierLineFor(definitions[0].definition),
  };
}
