import { Injectable, Signal, signal } from '@angular/core';
import {
  AxisType,
  SimulationSummaryDto,
  TargetedAxisResultDto,
} from '@psychotech/shared';
import { EMPTY, Observable, of } from 'rxjs';
import { buildExampleAxisDetail } from '../data/example-axis-detail.fixture';
import { buildExampleBilan } from '../data/example-bilan.fixture';

const EXAMPLE_STARTED_AT = '2026-06-14T18:00:00.000Z';
const EXAMPLE_COMPLETED_AT = '2026-06-14T18:30:00.000Z';

@Injectable()
export class ExampleBilanFacade {
  private readonly summarySignal = signal<SimulationSummaryDto | null>(
    buildExampleBilan(EXAMPLE_COMPLETED_AT),
  );

  readonly summary: Signal<SimulationSummaryDto | null> =
    this.summarySignal.asReadonly();

  loadSummary(): Observable<SimulationSummaryDto> {
    const summary = this.summarySignal();
    return summary ? of(summary) : EMPTY;
  }

  loadAxisDetail(
    sessionId: string,
    axis: AxisType,
  ): Observable<TargetedAxisResultDto> {
    const detail = buildExampleAxisDetail(axis, {
      startedAt: EXAMPLE_STARTED_AT,
      completedAt: EXAMPLE_COMPLETED_AT,
    });
    return detail ? of(detail) : EMPTY;
  }
}
