import { Injectable, Signal, inject } from '@angular/core';
import {
  CurrentSessionDto,
  SessionHistoryItemDto,
} from '@psychotech/shared';
import {
  SessionHistoryFilter,
  historyQueryFor,
} from './session-history.filter';
import { SessionHistoryStore } from './session-history.store';
import { SessionsApi } from './sessions.api';

@Injectable({ providedIn: 'root' })
export class SessionHistoryFacade {
  private readonly api = inject(SessionsApi);
  private readonly store = inject(SessionHistoryStore);

  readonly items: Signal<SessionHistoryItemDto[]> = this.store.items;
  readonly nextCursor: Signal<string | null> = this.store.nextCursor;
  readonly filter: Signal<SessionHistoryFilter> = this.store.filter;
  readonly loading: Signal<boolean> = this.store.loading;
  readonly loadingMore: Signal<boolean> = this.store.loadingMore;
  readonly current: Signal<CurrentSessionDto | null> = this.store.current;

  load(filter: SessionHistoryFilter): void {
    this.store.startLoading(filter);
    this.api.history(historyQueryFor(filter)).subscribe({
      next: (page) => this.store.setPage(page),
      error: () => this.store.setPage({ items: [], nextCursor: null }),
    });
  }

  loadMore(): void {
    const cursor = this.store.nextCursor();
    if (!cursor || this.store.loadingMore()) {
      return;
    }
    this.store.startLoadingMore();
    this.api
      .history({ ...historyQueryFor(this.store.filter()), cursor })
      .subscribe({
        next: (page) => this.store.appendPage(page),
        error: () =>
          this.store.appendPage({ items: [], nextCursor: null }),
      });
  }

  refreshCurrent(): void {
    this.api.current().subscribe({
      next: (current) => this.store.setCurrent(current),
      error: () => this.store.setCurrent(null),
    });
  }
}
