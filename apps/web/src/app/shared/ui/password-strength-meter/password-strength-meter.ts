import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  getPasswordStrength,
  PasswordStrengthLevel,
} from '../../util/password-strength';

const LEVEL_LABELS: Record<PasswordStrengthLevel, string> = {
  empty: '',
  weak: 'Faible',
  medium: 'Moyen',
  strong: 'Solide',
  robust: 'Robuste',
};

const LEVEL_COLORS: Record<PasswordStrengthLevel, string> = {
  empty: 'var(--surface-muted)',
  weak: 'var(--danger)',
  medium: 'var(--warning)',
  strong: 'var(--success)',
  robust: 'var(--success)',
};

@Component({
  selector: 'ui-password-strength-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (strength().score > 0) {
      <div class="meter">
        <div class="meter__track" aria-hidden="true">
          @for (segment of segments; track segment) {
            <span
              class="meter__segment"
              [class.meter__segment--filled]="segment <= strength().score"
              [style.--meter-color]="colorVar()"
            ></span>
          }
        </div>
        <span class="meter__label" aria-live="polite" [style.color]="colorVar()">
          {{ labelText() }}
        </span>
      </div>
    }
  `,
  styles: `
    .meter {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .meter__track {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .meter__segment {
      height: 4px;
      border-radius: var(--radius-pill);
      background: var(--surface-muted);
      transition: background 0.2s ease;
    }
    .meter__segment--filled {
      background: var(--meter-color);
    }
    .meter__label {
      font: 600 12px/16px var(--font-ui);
    }
  `,
})
export class PasswordStrengthMeter {
  readonly value = input('');

  protected readonly segments = [1, 2, 3, 4];
  protected readonly strength = computed(() =>
    getPasswordStrength(this.value()),
  );
  protected readonly labelText = computed(
    () => LEVEL_LABELS[this.strength().level],
  );
  protected readonly colorVar = computed(
    () => LEVEL_COLORS[this.strength().level],
  );
}
