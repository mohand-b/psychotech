import { httpResource } from '@angular/common/http';
import { Injectable, Signal, inject, signal } from '@angular/core';
import { Sector, TrainingsOverviewDto } from '@psychotech/shared';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

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

  readonly overview: Signal<TrainingsOverviewDto | null> =
    this.overviewResource.value;
  readonly loading: Signal<boolean> = this.overviewResource.isLoading;

  load(sector: Sector): void {
    this.sector.set(sector);
  }
}
