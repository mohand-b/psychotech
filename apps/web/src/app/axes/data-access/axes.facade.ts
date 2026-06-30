import { httpResource } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import { AxisBestDto } from '@psychotech/shared';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable()
export class AxesFacade {
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly bestScoresResource = httpResource<AxisBestDto[]>(
    () => `${this.baseUrl}/me/axes/best`,
    { defaultValue: [] },
  );

  readonly bestScores: Signal<AxisBestDto[]> = this.bestScoresResource.value;
  readonly loading: Signal<boolean> = this.bestScoresResource.isLoading;

  reload(): void {
    this.bestScoresResource.reload();
  }
}
