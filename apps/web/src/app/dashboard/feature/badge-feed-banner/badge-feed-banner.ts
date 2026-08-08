import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  BADGE_BY_ID,
  BadgeFeedDto,
  badgeAssetPath,
  badgeDisplayName,
} from '@psychotech/shared';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { Clock } from '../../../shared/util/clock';
import { formatRelativeTime } from '../../../shared/util/format-relative-time';

interface FeedEntryView {
  assetPath: string;
  label: string;
  badgeName: string;
  timeLabel: string;
}

@Component({
  selector: 'app-badge-feed-banner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './badge-feed-banner.html',
  styleUrl: './badge-feed-banner.css',
})
export class BadgeFeedBanner {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly clock = inject(Clock);

  private readonly feedResource = httpResource<BadgeFeedDto>(
    () => `${this.baseUrl}/me/badges/feed`,
    { defaultValue: { visible: false, entries: [] } },
  );

  protected readonly entries = computed<FeedEntryView[]>(() => {
    const feed = this.feedResource.value();
    if (!feed.visible) {
      return [];
    }
    const now = this.clock.now();
    return feed.entries.flatMap((entry) => {
      const definition = BADGE_BY_ID.get(entry.badgeId);
      return definition
        ? [
            {
              assetPath: badgeAssetPath(definition, entry.sector),
              label: entry.label,
              badgeName: badgeDisplayName(definition, entry.sector),
              timeLabel: formatRelativeTime(entry.earnedAt, now),
            },
          ]
        : [];
    });
  });

  protected readonly visible = computed(() => this.entries().length > 0);
}
