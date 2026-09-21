import { Injectable, Signal, computed, signal } from '@angular/core';
import {
  RELEASE_LOG,
  formatVersionLabel,
  Release,
  UPCOMING_ITEMS,
  UpcomingItem,
} from './release-log';

function byMostRecentFirst(left: Release, right: Release): number {
  return right.releasedOn.localeCompare(left.releasedOn);
}

@Injectable({ providedIn: 'root' })
export class ReleaseLogFacade {
  readonly releases: Signal<readonly Release[]> = signal(
    [...RELEASE_LOG].sort(byMostRecentFirst),
  ).asReadonly();
  readonly upcoming: Signal<readonly UpcomingItem[]> =
    signal(UPCOMING_ITEMS).asReadonly();
  readonly latestVersionLabel = computed(() => {
    const latest = this.releases().at(0);
    return latest ? formatVersionLabel(latest.version) : null;
  });
}
