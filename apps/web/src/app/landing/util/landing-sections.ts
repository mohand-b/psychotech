export const LANDING_SECTION = {
  hero: 'hero',
  story: 'fonctionnement',
  axes: 'axes',
  enterprise: 'entreprises',
  faq: 'faq',
} as const;

export type LandingSectionId =
  (typeof LANDING_SECTION)[keyof typeof LANDING_SECTION];

export function landingAnchorHref(
  section: LandingSectionId,
  onLanding: boolean,
): string {
  return onLanding ? `#${section}` : `/#${section}`;
}
