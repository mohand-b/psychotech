import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import {
  BADGE_BY_ID,
  badgeAssetPath,
  badgeDisplayName,
} from '@psychotech/shared';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
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
  private readonly clock = inject(Clock);
  private readonly feed = inject(BadgesFacade).fetchFeed();

  protected readonly entries = computed<FeedEntryView[]>(() => {
    const feed = this.feed();
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
