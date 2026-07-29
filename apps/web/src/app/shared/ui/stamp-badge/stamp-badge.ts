import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  AXIS_STAMP_WORD_LABELS,
  AxisStamp,
  SIMULATION_STAMP_QUALIFIER_LABELS,
  SimulationStamp,
  SimulationVerdict,
} from '@psychotech/shared';
import { SIMULATION_VERDICT_PRESENTATION } from '../simulation-verdict-presentation';
import { verdictWordInkVar } from '../verdict-appearance';

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
        <span class="stamp__sub">{{ qualifierLabel() }}</span>
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
      border: 2px solid color-mix(in srgb, var(--stamp-ink) 80%, transparent);
      border-radius: 5px;
      font-family: var(--font-stamp);
      text-transform: uppercase;
    }
    .stamp--simulation {
      padding: 5px 12px 4px;
      transform: rotate(-3.5deg);
      background: color-mix(in srgb, var(--stamp-ink) 6%, transparent);
    }
    .stamp--simulation.stamp--unfavorable {
      transform: rotate(2.5deg);
    }
    .stamp--axis {
      padding: 4px 11px;
      transform: rotate(-2.5deg);
    }
    .stamp__main {
      font-size: 12.5px;
      letter-spacing: 0.06em;
      line-height: 1.1;
      color: color-mix(in srgb, var(--stamp-ink) 92%, transparent);
    }
    .stamp__main--word {
      font-size: 12px;
      letter-spacing: 0.08em;
    }
    .stamp__sub {
      font-size: 8.5px;
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
    return stamp ? SIMULATION_VERDICT_PRESENTATION[stamp.verdict].inkVar : '';
  });

  protected readonly wordLabel = computed(() => {
    const stamp = this.axisStamp();
    return stamp ? AXIS_STAMP_WORD_LABELS[stamp.word] : '';
  });

  protected readonly axisInk = computed(() => {
    const stamp = this.axisStamp();
    return stamp ? verdictWordInkVar(stamp.word) : '';
  });
}
