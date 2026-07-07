import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { ShapeId, ShapeRotation } from '@psychotech/shared';

const WIDE_VIEWBOX_WIDTH = 36;
const NARROW_VIEWBOX_WIDTH = 16;
const SQUARE_VIEWBOX_WIDTH = 24;

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
        @case (shapeIds.DIAMOND) {
          @if (sideways()) {
            <polygon points="18,1.5 34.5,12 18,22.5 1.5,12" />
          } @else {
            <polygon points="8,1.5 14.5,12 8,22.5 1.5,12" />
          }
        }
        @case (shapeIds.RECTANGLE) {
          @if (sideways()) {
            <rect x="1.5" y="1.5" width="13" height="21" rx="1.5" />
          } @else {
            <rect x="1.5" y="1.5" width="33" height="21" rx="1.5" />
          }
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
  readonly strokeWidth = input(2.75);

  protected readonly shapeIds = ShapeId;

  protected readonly sideways = computed(() => this.rotation() % 180 === 90);

  protected readonly viewBoxWidth = computed(() => {
    const shape = this.shape();
    if (shape === ShapeId.DIAMOND) {
      return this.sideways() ? WIDE_VIEWBOX_WIDTH : NARROW_VIEWBOX_WIDTH;
    }
    if (shape === ShapeId.RECTANGLE) {
      return this.sideways() ? NARROW_VIEWBOX_WIDTH : WIDE_VIEWBOX_WIDTH;
    }
    return SQUARE_VIEWBOX_WIDTH;
  });

  protected readonly svgWidth = computed(() =>
    Math.round((this.size() * this.viewBoxWidth()) / 24),
  );
}
