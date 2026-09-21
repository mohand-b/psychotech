import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { HybridHeader } from '../../../layout/hybrid-header/hybrid-header';
import {
  CONTACT_ROUTE,
  contactQueryParams,
} from '../../../shared/util/contact-link';
import {
  ReleaseCategory,
  formatVersionLabel,
  releaseAnchor,
} from '../../data-access/release-log';
import { ReleaseLogFacade } from '../../data-access/release-log.facade';
import {
  ALL_RELEASES_FILTER,
  ALL_RELEASES_FILTER_LABEL,
  MINIMUM_CATEGORIES_FOR_FILTERS,
  RELEASE_CATEGORY_FILTERS,
  RELEASE_CATEGORY_ORDER,
  RELEASE_CATEGORY_TAGS,
  UPCOMING_ANCHOR,
  UPCOMING_STATUS_TAGS,
  formatReleaseDate,
  formatReleaseMonth,
} from '../../ui/release-presentation';

type ReleaseFilter = ReleaseCategory | typeof ALL_RELEASES_FILTER;

interface ReleaseItemView {
  category: ReleaseCategory;
  tag: string;
  text: string;
}

interface ReleaseView {
  anchor: string;
  versionLabel: string;
  dateLabel: string;
  monthLabel: string;
  title: string;
  latest: boolean;
  items: ReleaseItemView[];
}

interface FilterView {
  id: ReleaseFilter;
  label: string;
}

@Component({
  selector: 'app-nouveautes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HybridHeader, RouterLink],
  templateUrl: './nouveautes.html',
  styleUrl: './nouveautes.css',
})
export class Nouveautes {
  private readonly releaseLog = inject(ReleaseLogFacade);
  private readonly authFacade = inject(AuthFacade);

  protected readonly authenticated = this.authFacade.isAuthenticated;

  protected readonly upcomingAnchor = UPCOMING_ANCHOR;
  protected readonly contactRoute = CONTACT_ROUTE;
  protected readonly suggestionParams = contactQueryParams({
    motif: 'suggestion',
  });

  protected readonly filter = signal<ReleaseFilter>(ALL_RELEASES_FILTER);

  private readonly releases = computed<ReleaseView[]>(() =>
    this.releaseLog.releases().map((release, index) => ({
      anchor: releaseAnchor(release.version),
      versionLabel: formatVersionLabel(release.version),
      dateLabel: formatReleaseDate(release.releasedOn),
      monthLabel: formatReleaseMonth(release.releasedOn),
      title: release.title,
      latest: index === 0,
      items: RELEASE_CATEGORY_ORDER.flatMap((category) =>
        (release.entries[category] ?? []).map((text) => ({
          category,
          tag: RELEASE_CATEGORY_TAGS[category],
          text,
        })),
      ),
    })),
  );

  protected readonly tableOfContents = this.releases;

  protected readonly filters = computed<FilterView[]>(() => {
    const present = RELEASE_CATEGORY_ORDER.filter((category) =>
      this.releases().some((release) =>
        release.items.some((item) => item.category === category),
      ),
    );
    return present.length < MINIMUM_CATEGORIES_FOR_FILTERS
      ? []
      : [
          { id: ALL_RELEASES_FILTER, label: ALL_RELEASES_FILTER_LABEL },
          ...present.map((category) => ({
            id: category,
            label: RELEASE_CATEGORY_FILTERS[category],
          })),
        ];
  });

  protected readonly visibleReleases = computed<ReleaseView[]>(() => {
    const filter = this.filter();
    return filter === ALL_RELEASES_FILTER
      ? this.releases()
      : this.releases()
          .map((release) => ({
            ...release,
            items: release.items.filter((item) => item.category === filter),
          }))
          .filter((release) => release.items.length > 0);
  });

  protected readonly upcoming = computed(() =>
    this.filter() === ALL_RELEASES_FILTER
      ? this.releaseLog.upcoming().map((item) => ({
          ...item,
          tag: UPCOMING_STATUS_TAGS[item.status],
        }))
      : [],
  );
}
