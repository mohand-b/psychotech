import { Injectable, inject, signal } from '@angular/core';
import {
  AxisType,
  SimulationSummaryDto,
  TargetedAxisResultDto,
} from '@psychotech/shared';
import { Observable, of, tap } from 'rxjs';
import { SessionsApi } from './sessions.api';

@Injectable({ providedIn: 'root' })
export class SimulationSummaryFacade {
  private readonly api = inject(SessionsApi);

  private readonly summaryCache = signal<SimulationSummaryDto | null>(null);
  private readonly axisDetailCache = new Map<string, TargetedAxisResultDto>();

  loadSummary(sessionId: string): Observable<SimulationSummaryDto> {
    const cached = this.summaryCache();
    if (cached?.sessionId === sessionId) {
      return of(cached);
    }
    return this.api
      .simulationSummary(sessionId)
      .pipe(tap((summary) => this.summaryCache.set(summary)));
  }

  loadAxisDetail(
    sessionId: string,
    axis: AxisType,
  ): Observable<TargetedAxisResultDto> {
    const key = `${sessionId}:${axis}`;
    const cached = this.axisDetailCache.get(key);
    if (cached) {
      return of(cached);
    }
    return this.api
      .targetedResult(sessionId, axis)
      .pipe(tap((detail) => this.axisDetailCache.set(key, detail)));
  }
}
