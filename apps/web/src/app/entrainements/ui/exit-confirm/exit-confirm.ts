import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { SessionMode } from '@psychotech/shared';
import { Button, ButtonColor } from '../../../shared/ui/button/button';

@Component({
  selector: 'app-exit-confirm',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button],
  host: {
    role: 'alertdialog',
    'aria-label': 'Confirmation de sortie',
  },
  template: `
    <p class="exit__title">Quitter l'épreuve ?</p>
    <p class="exit__text">{{ subtext() }}</p>
    <div class="exit__actions">
      <ui-button
        color="neutral"
        appearance="outlined"
        (click)="continueRequested.emit()"
      >
        Continuer l'épreuve
      </ui-button>
      <ui-button
        [color]="color()"
        [loading]="leaving()"
        (click)="quitRequested.emit()"
      >
        Quitter
      </ui-button>
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-card);
      padding: 24px;
    }
    .exit__title {
      margin: 0;
      font: 600 15px/20px var(--font-ui);
      color: var(--ink);
      text-align: center;
    }
    .exit__text {
      margin: 0;
      font: 400 13px/18px var(--font-ui);
      color: var(--text-secondary);
      text-align: center;
    }
    .exit__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 12px;
    }
  `,
})
export class ExitConfirm {
  readonly mode = input.required<SessionMode>();
  readonly color = input<ButtonColor>('brand');
  readonly leaving = input(false);
  readonly continueRequested = output<void>();
  readonly quitRequested = output<void>();

  protected readonly subtext = computed(() =>
    this.mode() === SessionMode.FULL
      ? "Votre progression est conservée - vous reprendrez au début de l'axe en cours."
      : 'Vous recommencerez depuis le début, avec les mêmes exercices.',
  );
}
