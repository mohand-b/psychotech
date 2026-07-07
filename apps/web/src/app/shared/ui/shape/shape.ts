import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ShapeId, ShapeRotation } from '@psychotech/shared';

const WIDE_VIEWBOX_WIDTH = 36;
const SQUARE_VIEWBOX_WIDTH = 24;

const WIDE_SHAPES: readonly ShapeId[] = [
  ShapeId.RECTANGLE,
  ShapeId.TRAPEZOID,
  ShapeId.TRAPEZOID_RIGHT,
  ShapeId.TRAPEZOID_LEFT,
];

@Component({
  selector: 'ui-shape',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="svgWidth()"
      [attr.height]="size()"
      [attr.viewBox]="'0 0 ' + viewBoxWidth() + ' 24'"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linejoin="round"
      stroke-linecap="round"
      aria-hidden="true"
    >
      @switch (shape()) {
        @case (shapeIds.TRIANGLE) {
          @switch (rotation()) {
            @case (90) {
              <polygon points="2,1.5 22,12 2,22.5" />
            }
            @case (180) {
              <polygon points="1.5,2 22.5,2 12,22" />
            }
            @case (270) {
              <polygon points="22,1.5 22,22.5 2,12" />
            }
            @default {
              <polygon points="12,2 22.5,22 1.5,22" />
            }
          }
        }
        @case (shapeIds.SQUARE) {
          <rect x="1.5" y="1.5" width="21" height="21" rx="1.5" />
        }
        @case (shapeIds.CIRCLE) {
          <circle cx="12" cy="12" r="10.5" />
        }
        @case (shapeIds.RECTANGLE) {
          <rect x="1.5" y="1.5" width="33" height="21" rx="1.5" />
        }
        @case (shapeIds.TRAPEZOID) {
          @if (rotation() === 180) {
            <polygon points="1.5,1.5 34.5,1.5 25,22.5 11,22.5" />
          } @else {
            <polygon points="11,1.5 25,1.5 34.5,22.5 1.5,22.5" />
          }
        }
        @case (shapeIds.TRAPEZOID_RIGHT) {
          <polygon points="1.5,1.5 23,1.5 34.5,22.5 1.5,22.5" />
        }
        @case (shapeIds.TRAPEZOID_LEFT) {
          <polygon points="13,1.5 34.5,1.5 34.5,22.5 1.5,22.5" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    svg {
      display: block;
    }
  `,
})
export class Shape {
  readonly shape = input.required<ShapeId>();
  readonly rotation = input<ShapeRotation>(0);
  readonly size = input(24);
  readonly strokeWidth = input(3.4);

  protected readonly shapeIds = ShapeId;

  protected readonly viewBoxWidth = computed(() =>
    WIDE_SHAPES.includes(this.shape())
      ? WIDE_VIEWBOX_WIDTH
      : SQUARE_VIEWBOX_WIDTH,
  );

  protected readonly svgWidth = computed(() =>
    Math.round((this.size() * this.viewBoxWidth()) / 24),
  );
}
