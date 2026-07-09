import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-session-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="flex flex-col gap-2 p-6">
      <h1 class="t-page-title">Résultat de simulation</h1>
      <p class="t-support">
        Le détail des simulations complètes arrive prochainement.
      </p>
    </section>
  `,
})
export class SessionResult {}
