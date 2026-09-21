import { ReleaseCategory, UpcomingStatus } from '../data-access/release-log';

export const RELEASE_CATEGORY_ORDER: readonly ReleaseCategory[] = [
  ReleaseCategory.NEW,
  ReleaseCategory.IMPROVEMENT,
  ReleaseCategory.FIX,
  ReleaseCategory.CONTENT,
];

export const RELEASE_CATEGORY_TAGS: Record<ReleaseCategory, string> = {
  [ReleaseCategory.NEW]: 'Nouveau',
  [ReleaseCategory.IMPROVEMENT]: 'Amélioration',
  [ReleaseCategory.FIX]: 'Correction',
  [ReleaseCategory.CONTENT]: 'Contenu',
};

export const RELEASE_CATEGORY_FILTERS: Record<ReleaseCategory, string> = {
  [ReleaseCategory.NEW]: 'Nouveautés',
  [ReleaseCategory.IMPROVEMENT]: 'Améliorations',
  [ReleaseCategory.FIX]: 'Corrections',
  [ReleaseCategory.CONTENT]: 'Contenu',
};

export const UPCOMING_STATUS_TAGS: Record<UpcomingStatus, string> = {
  [UpcomingStatus.IN_PROGRESS]: 'En cours',
  [UpcomingStatus.UNDER_STUDY]: 'À l’étude',
};

export const ALL_RELEASES_FILTER = 'all';
export const ALL_RELEASES_FILTER_LABEL = 'Tout';
export const UPCOMING_ANCHOR = 'prevu';
export const MINIMUM_CATEGORIES_FOR_FILTERS = 2;

const FIRST_DAY_PATTERN = /^1 /;
const FIRST_DAY_LABEL = '1er ';

const RELEASE_DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const RELEASE_MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatReleaseDate(releasedOn: string): string {
  return RELEASE_DATE_FORMAT.format(new Date(releasedOn)).replace(
    FIRST_DAY_PATTERN,
    FIRST_DAY_LABEL,
  );
}

export function formatReleaseMonth(releasedOn: string): string {
  return RELEASE_MONTH_FORMAT.format(new Date(releasedOn));
}
