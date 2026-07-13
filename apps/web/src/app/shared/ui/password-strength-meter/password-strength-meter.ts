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

const LEVEL_LABEL_COLORS: Record<PasswordStrengthLevel, string> = {
  empty: 'var(--label)',
  weak: 'var(--danger-text)',
  medium: 'var(--axis-reactivity-text)',
  strong: 'var(--axis-discrimination-text)',
  robust: 'var(--axis-discrimination-text)',
};

const SEGMENT_COLORS = [
  'var(--danger)',
  'var(--stimulus-yellow)',
  'var(--secondary-dark)',
  'var(--secondary-dark)',
];

@Component({
  selector: 'ui-password-strength-meter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (strength().score > 0) {
      <div class="meter">
        <div class="meter__track" aria-hidden="true">
          @for (segment of segments; track segment; let index = $index) {
            <span
              class="meter__segment"
              [class.meter__segment--filled]="segment <= strength().score"
              [style.--meter-color]="segmentColors[index]"
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
      align-items: center;
      gap: 10px;
      padding: 0 var(--radius-input);
    }
    @media (min-width: 768px) {
      .meter {
        padding: 0 12px;
      }
    }
    .meter__track {
      display: flex;
      gap: 4px;
      flex: 1;
    }
    .meter__segment {
      height: 4px;
      border-radius: 2px;
      flex: 1;
      background: var(--border);
      transition: background 0.2s ease;
    }
    .meter__segment--filled {
      background: var(--meter-color);
    }
    .meter__label {
      font: 600 12px/16px var(--font-ui);
      flex-shrink: 0;
    }
  `,
})
export class PasswordStrengthMeter {
  readonly value = input('');

  protected readonly segments = [1, 2, 3, 4];
  protected readonly segmentColors = SEGMENT_COLORS;
  protected readonly strength = computed(() =>
    getPasswordStrength(this.value()),
  );
  protected readonly labelText = computed(
    () => LEVEL_LABELS[this.strength().level],
  );
  protected readonly colorVar = computed(
    () => LEVEL_LABEL_COLORS[this.strength().level],
  );
}
