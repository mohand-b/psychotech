import { ErrorHandler, Injectable, Signal, inject } from '@angular/core';
import { CurrentSessionDto, SessionHistoryItemDto } from '@psychotech/shared';
import {
  SessionHistoryFilter,
  buildHistoryQuery,
} from './session-history.filter';
import { SessionHistoryStore } from './session-history.store';
import { SessionsApi } from './sessions.api';

@Injectable({ providedIn: 'root' })
export class SessionHistoryFacade {
  private readonly api = inject(SessionsApi);
  private readonly store = inject(SessionHistoryStore);
  private readonly errorHandler = inject(ErrorHandler);

  readonly items: Signal<SessionHistoryItemDto[]> = this.store.items;
  readonly nextCursor: Signal<string | null> = this.store.nextCursor;
  readonly filter: Signal<SessionHistoryFilter> = this.store.filter;
  readonly loading: Signal<boolean> = this.store.loading;
  readonly loadingMore: Signal<boolean> = this.store.loadingMore;
  readonly current: Signal<CurrentSessionDto | null> = this.store.current;
  readonly error: Signal<unknown> = this.store.error;

  loadHistory(filter: SessionHistoryFilter): void {
    this.store.startLoading(filter);
    this.api.fetchHistoryPage(buildHistoryQuery(filter)).subscribe({
      next: (page) => this.store.setPage(page),
      error: (err: unknown) => this.store.setError(err),
    });
  }

  loadNextHistoryPage(): void {
    const cursor = this.store.nextCursor();
    if (!cursor || this.store.loadingMore()) {
      return;
    }
    this.store.startLoadingMore();
    this.api
      .fetchHistoryPage({ ...buildHistoryQuery(this.store.filter()), cursor })
      .subscribe({
        next: (page) => this.store.appendPage(page),
        error: (err: unknown) => this.store.setError(err),
      });
  }

  loadCurrentSession(): void {
    this.api.fetchCurrentSession().subscribe({
      next: (current) => this.store.setCurrent(current),
      error: (error: unknown) => {
        this.errorHandler.handleError(error);
        this.store.setCurrent(null);
      },
    });
  }
}
