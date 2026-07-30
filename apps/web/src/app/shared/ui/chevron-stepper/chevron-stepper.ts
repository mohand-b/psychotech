import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { AxisType, FULL_SESSION_LABEL_LOWER } from '@psychotech/shared';
import { Check, LucideIconData } from 'lucide-angular';
import { Icon } from '../icon/icon';
import { AXIS_PRESENTATION } from '../axis-presentation';

export type StepState = 'done' | 'current' | 'todo' | 'plain';

export interface ChevronStep {
  axis: AxisType;
  state: StepState;
}

export type ChevronStepperVariant = 'full' | 'mini';

export type ChevronStepperMode = 'progress' | 'explorer';

interface DecoratedStep {
  axis: AxisType;
  state: StepState;
  number: string;
  label: string;
  icon: LucideIconData;
  pastelVar: string;
  textVar: string;
  accentVar: string;
}

@Component({
  selector: 'ui-chevron-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, NgTemplateOutlet],
  template: `
    <nav [class]="navClasses()" [attr.aria-label]="navLabel()">
      @for (
        step of decoratedSteps();
        track step.axis;
        let index = $index;
        let first = $first;
        let last = $last
      ) {
        @if (isExplorer()) {
          <button
            #stepButton
            type="button"
            class="step step--interactive"
            [class.step--first]="first"
            [class.step--last]="last"
            [class.step--active]="index === activeIndex()"
            [style.--axis-pastel]="step.pastelVar"
            [style.--axis-text]="step.textVar"
            [style.--axis-accent]="step.accentVar"
            [title]="step.label"
            [tabindex]="index === selectedIndex() ? 0 : -1"
            [attr.aria-label]="variant() === 'mini' ? step.label : null"
            [attr.aria-current]="index === selectedIndex() ? 'true' : null"
            (pointerenter)="previewStep(index)"
            (pointerleave)="clearPreview()"
            (click)="selectStep(index)"
            (keydown)="onKeydown($event)"
          >
            <ng-container
              [ngTemplateOutlet]="stepContent"
              [ngTemplateOutletContext]="{ $implicit: step }"
            />
          </button>
        } @else {
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
            <ng-container
              [ngTemplateOutlet]="stepContent"
              [ngTemplateOutletContext]="{ $implicit: step }"
            />
          </span>
        }
      }
    </nav>

    <ng-template #stepContent let-step>
      <span class="step__number">{{ step.number }}</span>
      <ui-icon
        [img]="step.state === 'done' ? checkIcon : step.icon"
        [size]="14"
        [strokeWidth]="step.state === 'done' ? 2.5 : 2"
      />
      @if (variant() === 'full') {
        <span class="step__label">{{ step.label }}</span>
      }
    </ng-template>
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
      --notch: 13px;
      --overlap: -8px;
    }
    .stepper--mini {
      justify-content: flex-start;
      --notch: 10px;
      --overlap: -6px;
    }
    .step {
      position: relative;
      overflow: hidden;
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
      clip-path: shape(
        from 0% 0%,
        line to calc(100% - var(--notch)) 0%,
        line to calc(100% - var(--notch) * 0.3) 35%,
        curve to calc(100% - var(--notch) * 0.3) 65% with 100% 50%,
        line to calc(100% - var(--notch)) 100%,
        line to 0% 100%,
        line to calc(var(--notch) * 0.7) 65%,
        curve to calc(var(--notch) * 0.7) 35% with var(--notch) 50%,
        close
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
      clip-path: shape(
        from 0% 0%,
        line to calc(100% - var(--notch)) 0%,
        line to calc(100% - var(--notch) * 0.3) 35%,
        curve to calc(100% - var(--notch) * 0.3) 65% with 100% 50%,
        line to calc(100% - var(--notch)) 100%,
        line to 0% 100%,
        close
      );
    }
    .step--last {
      clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%, var(--notch) 50%);
      clip-path: shape(
        from 0% 0%,
        line to 100% 0%,
        line to 100% 100%,
        line to 0% 100%,
        line to calc(var(--notch) * 0.7) 65%,
        curve to calc(var(--notch) * 0.7) 35% with var(--notch) 50%,
        close
      );
    }
    .step--current::after,
    .step--active::after {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 2px;
      background: var(--axis-accent);
    }
    .step--todo {
      background: var(--surface-muted);
      color: var(--text-disabled);
    }
    .step--interactive {
      border: none;
      cursor: pointer;
    }
    .step--interactive:focus-visible {
      outline: none;
      box-shadow: inset 0 0 0 2px var(--axis-accent);
    }
    .stepper--full .step {
      gap: 7px;
      padding: 12px 20px 12px 25px;
      font-size: 13px;
    }
    .stepper--full .step--first {
      padding: 12px 20px 12px 15px;
      border-radius: 8px 0 0 8px;
    }
    .stepper--full .step--last {
      padding: 12px 15px 12px 25px;
      border-radius: 0 8px 8px 0;
    }
    .stepper--mini .step {
      gap: 5px;
      padding: 12px 16px 12px 20px;
    }
    .stepper--mini .step--first {
      padding: 12px 16px 12px 12px;
      border-radius: 6px 0 0 6px;
    }
    .stepper--mini .step--last {
      padding: 12px 13px 12px 20px;
      border-radius: 0 6px 6px 0;
    }
    .step__number {
      font-family: var(--font-mono);
      font-variant-numeric: tabular-nums;
      font-size: 11px;
      line-height: 1;
      opacity: 0.65;
    }
    .step__label {
      line-height: 1;
    }
  `,
})
export class ChevronStepper {
  readonly mode = input<ChevronStepperMode>('progress');
  readonly variant = input<ChevronStepperVariant>('full');
  readonly axes = input<readonly AxisType[]>([]);
  readonly currentIndex = input(0);
  readonly steps = input<readonly ChevronStep[]>([]);
  readonly activeAxisChange = output<AxisType>();

  protected readonly checkIcon = Check;

  protected readonly isExplorer = computed(() => this.mode() === 'explorer');

  protected readonly selectedIndex = signal(0);
  private readonly previewIndex = signal<number | null>(null);
  protected readonly activeIndex = computed(
    () => this.previewIndex() ?? this.selectedIndex(),
  );

  private readonly stepButtons =
    viewChildren<ElementRef<HTMLButtonElement>>('stepButton');

  protected readonly navClasses = computed(
    () => `stepper stepper--${this.variant()}`,
  );

  protected readonly navLabel = computed(() =>
    this.isExplorer()
      ? `Parcours de l'${FULL_SESSION_LABEL_LOWER}`
      : `Progression de l'${FULL_SESSION_LABEL_LOWER}`,
  );

  private readonly effectiveSteps = computed<ChevronStep[]>(() => {
    if (this.isExplorer()) {
      return this.axes().map((axis) => ({ axis, state: 'plain' }));
    }
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
    this.effectiveSteps().map((step, index) => {
      const presentation = AXIS_PRESENTATION[step.axis];
      return {
        axis: step.axis,
        state: step.state,
        number: String(index + 1).padStart(2, '0'),
        label: presentation.shortLabel,
        icon: presentation.icon,
        pastelVar: presentation.pastelVar,
        textVar: presentation.textVar,
        accentVar: presentation.plainVar,
      };
    }),
  );

  constructor() {
    effect(() => {
      if (!this.isExplorer()) {
        return;
      }
      const step = this.decoratedSteps()[this.activeIndex()];
      if (step) {
        this.activeAxisChange.emit(step.axis);
      }
    });
  }

  protected previewStep(index: number): void {
    this.previewIndex.set(index);
  }

  protected clearPreview(): void {
    this.previewIndex.set(null);
  }

  protected selectStep(index: number): void {
    this.selectedIndex.set(index);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const delta =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) {
      return;
    }
    event.preventDefault();
    const lastIndex = this.decoratedSteps().length - 1;
    const next = Math.min(lastIndex, Math.max(0, this.selectedIndex() + delta));
    this.previewIndex.set(null);
    this.selectedIndex.set(next);
    this.stepButtons()[next]?.nativeElement.focus();
  }
}
