import { Injectable, Signal, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ProgressionDto } from '@psychotech/shared';
import { ProgressionApi } from './progression.api';

@Injectable()
export class ProgressionFacade {
  private readonly api = inject(ProgressionApi);

  private readonly progressionResource = rxResource<
    ProgressionDto | null,
    void
  >({
    stream: () => this.api.fetchProgression(),
    defaultValue: null,
  });

  readonly progression: Signal<ProgressionDto | null> =
    this.progressionResource.value;
  readonly loading: Signal<boolean> = this.progressionResource.isLoading;
}
