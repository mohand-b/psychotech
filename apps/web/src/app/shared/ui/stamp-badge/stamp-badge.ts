import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  AXIS_STAMP_WORD_LABELS,
  AxisStamp,
  AxisStampWord,
  SIMULATION_STAMP_QUALIFIER_LABELS,
  SimulationStamp,
  SimulationVerdict,
} from '@psychotech/shared';
import { SIMULATION_VERDICT_PRESENTATION } from '../simulation-verdict-presentation';

const VERDICT_INK_VARS: Record<SimulationVerdict, string> = {
  [SimulationVerdict.FAVORABLE]: 'var(--rating-good-ink)',
  [SimulationVerdict.UNFAVORABLE]: 'var(--rating-bad-ink)',
};

const AXIS_WORD_INK_VARS: Record<AxisStampWord, string> = {
  [AxisStampWord.SOLID]: 'var(--rating-good-ink)',
  [AxisStampWord.GOOD]: 'var(--rating-ok-ink)',
  [AxisStampWord.FRAGILE]: 'var(--rating-weak-ink)',
  [AxisStampWord.WEAK]: 'var(--rating-bad-ink)',
  [AxisStampWord.ELIMINATORY]: 'var(--rating-bad-ink)',
};

@Component({
  selector: 'ui-stamp-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (simulationStamp(); as stamp) {
      <span
        class="stamp stamp--simulation"
        [class.stamp--unfavorable]="unfavorable()"
        [style.--stamp-ink]="simulationInk()"
      >
        <span class="stamp__main">{{ verdictLabel() }}</span>
        <span class="stamp__sub"
          >{{ qualifierLabel() }} · {{ stamp.date }}</span
        >
      </span>
    } @else if (axisStamp(); as stamp) {
      <span
        class="stamp stamp--axis"
        [class.stamp--eliminatory]="stamp.isEliminatory"
        [style.--stamp-ink]="axisInk()"
      >
        <span class="stamp__main stamp__main--word">{{ wordLabel() }}</span>
      </span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .stamp {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      border: 2.5px solid color-mix(in srgb, var(--stamp-ink) 80%, transparent);
      border-radius: 5px;
      font-family: var(--font-stamp);
      text-transform: uppercase;
    }
    .stamp--simulation {
      padding: 6px 14px 5px;
      transform: rotate(-3.5deg);
      background: color-mix(in srgb, var(--stamp-ink) 6%, transparent);
    }
    .stamp--simulation.stamp--unfavorable {
      transform: rotate(2.5deg);
    }
    .stamp--axis {
      padding: 5px 13px;
      transform: rotate(-2.5deg);
    }
    .stamp__main {
      font-size: 14.5px;
      letter-spacing: 0.06em;
      line-height: 1.1;
      color: color-mix(in srgb, var(--stamp-ink) 92%, transparent);
    }
    .stamp__main--word {
      font-size: 13.5px;
      letter-spacing: 0.08em;
    }
    .stamp__sub {
      font-size: 9.5px;
      letter-spacing: 0.12em;
      color: color-mix(in srgb, var(--stamp-ink) 82%, transparent);
    }
    .stamp--axis.stamp--eliminatory {
      transform: rotate(-3deg);
      border-color: color-mix(in srgb, var(--stamp-ink) 88%, transparent);
      background: color-mix(in srgb, var(--stamp-ink) 6%, transparent);
    }
    .stamp--axis.stamp--eliminatory .stamp__main {
      color: color-mix(in srgb, var(--stamp-ink) 95%, transparent);
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  `,
})
export class StampBadge {
  readonly simulationStamp = input<SimulationStamp | null>(null);
  readonly axisStamp = input<AxisStamp | null>(null);

  protected readonly unfavorable = computed(
    () =>
      this.simulationStamp()?.verdict === SimulationVerdict.UNFAVORABLE,
  );

  protected readonly verdictLabel = computed(() => {
    const stamp = this.simulationStamp();
    return stamp ? SIMULATION_VERDICT_PRESENTATION[stamp.verdict].label : '';
  });

  protected readonly qualifierLabel = computed(() => {
    const stamp = this.simulationStamp();
    return stamp ? SIMULATION_STAMP_QUALIFIER_LABELS[stamp.qualifier] : '';
  });

  protected readonly simulationInk = computed(() => {
    const stamp = this.simulationStamp();
    return stamp ? VERDICT_INK_VARS[stamp.verdict] : '';
  });

  protected readonly wordLabel = computed(() => {
    const stamp = this.axisStamp();
    return stamp ? AXIS_STAMP_WORD_LABELS[stamp.word] : '';
  });

  protected readonly axisInk = computed(() => {
    const stamp = this.axisStamp();
    return stamp ? AXIS_WORD_INK_VARS[stamp.word] : '';
  });
}
