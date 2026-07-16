import { httpResource } from '@angular/common/http';
import { Injectable, Signal, inject } from '@angular/core';
import { ProgressionDto } from '@psychotech/shared';
import { API_BASE_URL } from '../../core/http/api-base-url.token';

@Injectable()
export class ProgressionFacade {
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly progressionResource = httpResource<ProgressionDto | null>(
    () => `${this.baseUrl}/me/progression`,
    { defaultValue: null },
  );

  readonly progression: Signal<ProgressionDto | null> =
    this.progressionResource.value;
  readonly loading: Signal<boolean> = this.progressionResource.isLoading;
}
