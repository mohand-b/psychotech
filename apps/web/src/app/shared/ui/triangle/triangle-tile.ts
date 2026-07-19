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
      [attr.height]="size() * (88 / 100)"
      viewBox="0 0 100 88"
      aria-hidden="true"
    >
      <polygon points="50,6 9,77 91,77" class="frame" />
      <text
        x="50"
        y="26"
        class="value value--vertex"
        [class.value--unknown]="top() === null"
        data-slot="top"
      >
        {{ top() ?? '?' }}
      </text>
      <text
        x="23"
        y="70"
        class="value value--vertex"
        [class.value--unknown]="left() === null"
        data-slot="left"
      >
        {{ left() ?? '?' }}
      </text>
      <text
        x="77"
        y="70"
        class="value value--vertex"
        [class.value--unknown]="right() === null"
        data-slot="right"
      >
        {{ right() ?? '?' }}
      </text>
      <text
        x="50"
        y="58"
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
