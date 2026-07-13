import { Injectable, Signal, inject } from '@angular/core';
import { TutorialRunResult, TutorialRunStore } from './tutorial-run.store';

@Injectable({ providedIn: 'root' })
export class TutorialRunFacade {
  private readonly store = inject(TutorialRunStore);

  readonly result: Signal<TutorialRunResult | null> = this.store.result;

  record(result: TutorialRunResult): void {
    this.store.setResult(result);
  }

  clear(): void {
    this.store.setResult(null);
  }
}
