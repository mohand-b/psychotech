import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

@Component({
  selector: 'ui-triangle-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size() * (112 / 120)"
      viewBox="0 0 120 112"
      aria-hidden="true"
    >
      <polygon points="60,24 26,90 94,90" class="frame" />
      <text
        x="60"
        y="11"
        class="value value--vertex"
        [class.value--unknown]="top() === null"
        data-slot="top"
      >
        {{ top() ?? '?' }}
      </text>
      <text
        x="15"
        y="100"
        class="value value--vertex"
        [class.value--unknown]="left() === null"
        data-slot="left"
      >
        {{ left() ?? '?' }}
      </text>
      <text
        x="105"
        y="100"
        class="value value--vertex"
        [class.value--unknown]="right() === null"
        data-slot="right"
      >
        {{ right() ?? '?' }}
      </text>
      <text
        x="60"
        y="72"
        class="value value--center"
        [class.value--unknown]="center() === null"
        data-slot="center"
      >
        {{ center() ?? '?' }}
      </text>
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      color: var(--ink);
    }
    svg {
      display: block;
    }
    .frame {
      fill: var(--card);
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linejoin: round;
    }
    .value {
      fill: currentColor;
      font: 700 13px var(--font-mono);
      text-anchor: middle;
      dominant-baseline: middle;
    }
    .value--center {
      font-size: 12px;
    }
    .value--unknown {
      fill: var(--axis-logic);
    }
  `,
})
export class TriangleTile {
  readonly top = input.required<number | null>();
  readonly left = input.required<number | null>();
  readonly right = input.required<number | null>();
  readonly center = input.required<number | null>();
  readonly size = input(100);
}
