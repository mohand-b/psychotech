import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { Check, LucideIconData } from 'lucide-angular';
import { Icon } from '../icon/icon';
import { AXIS_PRESENTATION } from '../axis-presentation';

export type StepState = 'done' | 'current' | 'todo' | 'plain';

export interface ChevronStep {
  axis: AxisType;
  state: StepState;
}

export type ChevronStepperVariant = 'full' | 'mini';

interface DecoratedStep {
  axis: AxisType;
  state: StepState;
  label: string;
  icon: LucideIconData;
  pastelVar: string;
  textVar: string;
  accentVar: string;
}

@Component({
  selector: 'ui-chevron-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <nav [class]="navClasses()" aria-label="Progression de la simulation">
      @for (
        step of decoratedSteps();
        track step.axis;
        let first = $first;
        let last = $last
      ) {
        <span
          class="step"
          [class.step--first]="first"
          [class.step--last]="last"
          [class.step--done]="step.state === 'done'"
          [class.step--current]="step.state === 'current'"
          [class.step--todo]="step.state === 'todo'"
          [style.--axis-pastel]="step.pastelVar"
          [style.--axis-text]="step.textVar"
          [style.--axis-accent]="step.accentVar"
          [title]="step.label"
          [attr.aria-label]="variant() === 'mini' ? step.label : null"
          [attr.aria-current]="step.state === 'current' ? 'step' : null"
        >
          <ui-icon
            [img]="step.state === 'done' ? checkIcon : step.icon"
            [size]="14"
            [strokeWidth]="step.state === 'done' ? 2.5 : 2"
          />
          @if (variant() === 'full') {
            <span class="step__label">{{ step.label }}</span>
          }
        </span>
      }
    </nav>
  `,
  styles: `
    :host {
      display: inline-block;
      padding: 12px 16px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
    }
    .stepper {
      display: flex;
      align-items: center;
    }
    .stepper--full {
      justify-content: center;
      --notch: 10px;
      --overlap: -7px;
    }
    .stepper--mini {
      justify-content: flex-start;
      --notch: 8px;
      --overlap: -5px;
    }
    .step {
      display: inline-flex;
      align-items: center;
      margin-left: var(--overlap);
      font-family: var(--font-ui);
      font-weight: 600;
      clip-path: polygon(
        0 0,
        calc(100% - var(--notch)) 0,
        100% 50%,
        calc(100% - var(--notch)) 100%,
        0 100%,
        var(--notch) 50%
      );
      background: var(--axis-pastel);
      color: var(--axis-text);
    }
    .step--first {
      margin-left: 0;
      clip-path: polygon(
        0 0,
        calc(100% - var(--notch)) 0,
        100% 50%,
        calc(100% - var(--notch)) 100%,
        0 100%
      );
    }
    .step--last {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, var(--notch) 50%);
    }
    .step--current {
      box-shadow: inset 0 -2px 0 var(--axis-accent);
    }
    .step--todo {
      background: var(--surface-muted);
      color: var(--text-disabled);
    }
    .stepper--full .step {
      gap: 7px;
      padding: 8px 18px 8px 22px;
      font-size: 13px;
    }
    .stepper--full .step--first {
      padding: 8px 18px 8px 14px;
      border-radius: 8px 0 0 8px;
    }
    .stepper--full .step--last {
      padding: 8px 14px 8px 22px;
      border-radius: 0 8px 8px 0;
    }
    .stepper--mini .step {
      gap: 0;
      padding: 8px 20px 8px 22px;
    }
    .stepper--mini .step--first {
      padding: 8px 20px 8px 16px;
      border-radius: 6px 0 0 6px;
    }
    .stepper--mini .step--last {
      padding: 8px 18px 8px 22px;
      border-radius: 0 6px 6px 0;
    }
    .step__label {
      line-height: 1;
    }
  `,
})
export class ChevronStepper {
  readonly variant = input<ChevronStepperVariant>('full');
  readonly axes = input<readonly AxisType[]>([]);
  readonly currentIndex = input(0);
  readonly steps = input<readonly ChevronStep[]>([]);

  protected readonly checkIcon = Check;

  protected readonly navClasses = computed(
    () => `stepper stepper--${this.variant()}`,
  );

  private readonly effectiveSteps = computed<ChevronStep[]>(() => {
    const explicit = this.steps();
    if (explicit.length > 0) {
      return [...explicit];
    }
    const current = this.currentIndex();
    return this.axes().map((axis, index) => {
      const state: StepState =
        index < current ? 'done' : index === current ? 'current' : 'todo';
      return { axis, state };
    });
  });

  protected readonly decoratedSteps = computed<DecoratedStep[]>(() =>
    this.effectiveSteps().map((step) => {
      const presentation = AXIS_PRESENTATION[step.axis];
      return {
        axis: step.axis,
        state: step.state,
        label: presentation.shortLabel,
        icon: presentation.icon,
        pastelVar: presentation.pastelVar,
        textVar: presentation.textVar,
        accentVar: presentation.plainVar,
      };
    }),
  );
}
