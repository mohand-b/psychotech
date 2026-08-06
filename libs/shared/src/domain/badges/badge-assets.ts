import { AxisType, Sector } from '../../enums';
import { BadgeDefinition, BadgeId, BadgeTier } from './badge-model';

const BADGE_AXIS_SLUGS: Partial<Record<AxisType, string>> = {
  [AxisType.LOGIC]: 'logique',
  [AxisType.MEMORY]: 'memoire',
  [AxisType.VISUAL_DISCRIMINATION]: 'discrimination',
  [AxisType.REACTIVITY]: 'reactivite',
  [AxisType.MOTOR_SKILLS]: 'motricite',
};

const BADGE_TIER_SLUGS: Record<BadgeTier, string> = {
  [BadgeTier.BRONZE]: 'bronze',
  [BadgeTier.SILVER]: 'argent',
  [BadgeTier.GOLD]: 'or',
};

const BADGE_SECTOR_SLUGS: Partial<Record<Sector, string>> = {
  [Sector.RAILWAY]: 'ferroviaire',
};

export function badgeAssetPath(
  definition: BadgeDefinition,
  sector: Sector,
): string {
  if (definition.id === BadgeId.FIRST_STEPS) {
    return 'badges/badge-premiers-pas.svg';
  }
  if (definition.id === BadgeId.SECTOR_MASTERY) {
    const slug = BADGE_SECTOR_SLUGS[sector] ?? 'ferroviaire';
    return `badges/badge-secteur-${slug}.svg`;
  }
  const tier = definition.tier ?? BadgeTier.BRONZE;
  const metal = BADGE_TIER_SLUGS[tier];
  if (definition.axis !== null) {
    const axisSlug = BADGE_AXIS_SLUGS[definition.axis];
    return `badges/badge-${axisSlug}-${metal}.svg`;
  }
  return `badges/badge-examen-${metal}.svg`;
}
