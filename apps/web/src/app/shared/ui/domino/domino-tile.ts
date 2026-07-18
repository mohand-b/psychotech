import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DominoFace } from '@psychotech/shared';

interface Pip {
  cx: number;
  cy: number;
}

const PIP_COLUMNS = { left: 16, center: 30, right: 44 };

function pipsFor(face: DominoFace, offsetY: number): Pip[] {
  const rows = { top: offsetY + 10, middle: offsetY + 22, bottom: offsetY + 34 };
  const { left, center, right } = PIP_COLUMNS;
  switch (face) {
    case 0:
      return [];
    case 1:
      return [{ cx: center, cy: rows.middle }];
    case 2:
      return [
        { cx: left, cy: rows.top },
        { cx: right, cy: rows.bottom },
      ];
    case 3:
      return [
        { cx: left, cy: rows.top },
        { cx: center, cy: rows.middle },
        { cx: right, cy: rows.bottom },
      ];
    case 4:
      return [
        { cx: left, cy: rows.top },
        { cx: right, cy: rows.top },
        { cx: left, cy: rows.bottom },
        { cx: right, cy: rows.bottom },
      ];
    case 5:
      return [
        { cx: left, cy: rows.top },
        { cx: right, cy: rows.top },
        { cx: center, cy: rows.middle },
        { cx: left, cy: rows.bottom },
        { cx: right, cy: rows.bottom },
      ];
    case 6:
      return [
        { cx: left, cy: rows.top },
        { cx: right, cy: rows.top },
        { cx: left, cy: rows.middle },
        { cx: right, cy: rows.middle },
        { cx: left, cy: rows.bottom },
        { cx: right, cy: rows.bottom },
      ];
  }
}

@Component({
  selector: 'ui-domino-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="width()"
      [attr.height]="width() * (94 / 60)"
      viewBox="0 0 60 94"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="56" height="90" rx="7" class="frame" />
      <line x1="8" y1="47" x2="52" y2="47" class="separator" />
      @if (top() === null) {
        <text x="30" y="30" class="unknown">?</text>
      } @else {
        @for (pip of topPips(); track $index) {
          <circle [attr.cx]="pip.cx" [attr.cy]="pip.cy" r="4.2" class="pip pip--top" />
        }
      }
      @if (bottom() === null) {
        <text x="30" y="77" class="unknown">?</text>
      } @else {
        @for (pip of bottomPips(); track $index) {
          <circle [attr.cx]="pip.cx" [attr.cy]="pip.cy" r="4.2" class="pip pip--bottom" />
        }
      }
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
      stroke-width: 2.4;
    }
    .separator {
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
    }
    .pip {
      fill: currentColor;
    }
    .unknown {
      fill: var(--label);
      font: 700 20px var(--font-mono);
      text-anchor: middle;
      dominant-baseline: middle;
    }
  `,
})
export class DominoTile {
  readonly top = input.required<DominoFace | null>();
  readonly bottom = input.required<DominoFace | null>();
  readonly width = input(60);

  protected readonly topPips = computed<Pip[]>(() => {
    const face = this.top();
    return face === null ? [] : pipsFor(face, 0);
  });

  protected readonly bottomPips = computed<Pip[]>(() => {
    const face = this.bottom();
    return face === null ? [] : pipsFor(face, 47);
  });
}
