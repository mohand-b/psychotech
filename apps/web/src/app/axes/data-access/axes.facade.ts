import { Injectable, Signal, inject } from '@angular/core';
import { AxisBestDto } from '@psychotech/shared';
import { Observable, tap } from 'rxjs';
import { AxesApi } from './axes.api';
import { AxesStore } from './axes.store';

@Injectable({ providedIn: 'root' })
export class AxesFacade {
  private readonly api = inject(AxesApi);
  private readonly store = inject(AxesStore);

  readonly bestScores: Signal<AxisBestDto[] | null> = this.store.bestScores;

  loadBestScores(): Observable<AxisBestDto[]> {
    return this.api
      .bestScores()
      .pipe(tap((scores) => this.store.setBestScores(scores)));
  }

  clear(): void {
    this.store.setBestScores(null);
  }
}
