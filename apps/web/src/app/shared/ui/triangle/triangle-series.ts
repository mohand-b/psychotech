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
      }
    </div>
  `,
  styles: `
    .series {
      display: flex;
      align-items: flex-start;
      justify-content: center;
      gap: 16px;
      flex-wrap: wrap;
    }
    .series__item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .series__note {
      font-size: 11px;
      color: var(--brand-hover);
      text-align: center;
    }
  `,
})
export class TriangleSeries {
  readonly triangles = input.required<readonly TriangleValues[]>();
  readonly missing = input.required<TriangleMissing>();
  readonly answerValue = input.required<number | null>();
  readonly annotations = input<readonly string[] | null>(null);
  readonly tileSize = input(100);

  protected readonly views = computed<TriangleDisplayValues[]>(() => {
    const missing = this.missing();
    return this.triangles().map((triangle, index) =>
      index === missing.triangleIndex
        ? triangleDisplayValues(triangle, missing.slot, this.answerValue())
        : triangle,
    );
  });
}
