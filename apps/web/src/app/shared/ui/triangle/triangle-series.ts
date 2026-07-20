import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import {
  TriangleMissing,
  TriangleSlot,
  TriangleValues,
} from '@psychotech/shared';
import { TriangleTile } from './triangle-tile';

export interface TriangleDisplayValues {
  top: number | null;
  left: number | null;
  right: number | null;
  center: number | null;
}

export function triangleDisplayValues(
  values: TriangleValues,
  slot: TriangleSlot,
  answerValue: number | null,
): TriangleDisplayValues {
  return {
    top: slot === TriangleSlot.TOP ? answerValue : values.top,
    left: slot === TriangleSlot.LEFT ? answerValue : values.left,
    right: slot === TriangleSlot.RIGHT ? answerValue : values.right,
    center: slot === TriangleSlot.CENTER ? answerValue : values.center,
  };
}

@Component({
  selector: 'ui-triangle-series',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TriangleTile],
  template: `
    <div class="series">
      @for (view of views(); track $index) {
        <div class="series__step">
          <div class="series__item">
            <ui-triangle-tile
              [top]="view.top"
              [left]="view.left"
              [right]="view.right"
              [center]="view.center"
              [size]="tileSize()"
              [accentSlot]="
                $index === missing().triangleIndex ? missing().slot : null
              "
            />
            @if (annotations(); as notes) {
              <span class="series__note t-mono">{{ notes[$index] }}</span>
            }
          </div>
          @if (withArrows() && !$last) {
            <svg
              class="series__arrow"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14"></path>
              <path d="m12 5 7 7-7 7"></path>
            </svg>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .series {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .series__step {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .series__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .series__arrow {
      width: 13px;
      height: 13px;
      color: var(--border-hover);
    }
    .series__note {
      font-size: 11px;
      color: var(--brand-hover);
      text-align: center;
    }
    @media (max-width: 767px) {
      .series {
        gap: 10px 6px;
      }
      .series__arrow {
        display: none;
      }
    }
  `,
})
export class TriangleSeries {
  readonly triangles = input.required<readonly TriangleValues[]>();
  readonly missing = input.required<TriangleMissing>();
  readonly answerValue = input.required<number | null>();
  readonly annotations = input<readonly string[] | null>(null);
  readonly tileSize = input(100);
  readonly withArrows = input(false);

  protected readonly views = computed<TriangleDisplayValues[]>(() => {
    const missing = this.missing();
    return this.triangles().map((triangle, index) =>
      index === missing.triangleIndex
        ? triangleDisplayValues(triangle, missing.slot, this.answerValue())
        : triangle,
    );
  });
}
