import { httpResource } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { Sector, TrainingsOverviewDto } from '@psychotech/shared';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import { readResourceValueOr } from '../../shared/util/resource-value';

@Injectable()
export class TrainingsOverviewFacade {
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly sector = signal<Sector | null>(null);

  private readonly overviewResource = httpResource<TrainingsOverviewDto | null>(
    () => {
      const sector = this.sector();
      return sector
        ? `${this.baseUrl}/me/trainings/overview?sector=${sector}`
        : undefined;
    },
    { defaultValue: null },
  );

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
