import { Injectable, Signal, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Sector, TrainingsOverviewDto } from '@psychotech/shared';
import { readResourceValueOr } from '../../shared/util/resource-value';
import { TrainingsApi } from './trainings.api';

@Injectable()
export class TrainingsOverviewFacade {
  private readonly api = inject(TrainingsApi);
  private readonly sector = signal<Sector | undefined>(undefined);

  private readonly overviewResource = rxResource<
    TrainingsOverviewDto | null,
    Sector | undefined
  >({
    params: () => this.sector(),
    stream: ({ params: sector }) => this.api.fetchTrainingsOverview(sector),
    defaultValue: null,
  });

  readonly overview: Signal<TrainingsOverviewDto | null> = readResourceValueOr(
    this.overviewResource,
    null,
  );
  readonly loading: Signal<boolean> = this.overviewResource.isLoading;
  readonly error: Signal<unknown> = this.overviewResource.error;

  loadOverview(sector: Sector): void {
    this.sector.set(sector);
  }

  reloadOverview(): void {
    this.overviewResource.reload();
  }
}
