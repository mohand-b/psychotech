import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';
import { ShapeId, ShapeRotation } from '@psychotech/shared';

@Component({
  selector: 'ui-shape',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="strokeWidth()"
      stroke-linejoin="round"
      stroke-linecap="round"
      aria-hidden="true"
      [style.transform]="'rotate(' + rotation() + 'deg)'"
    >
      @switch (shape()) {
        @case (shapeIds.TRIANGLE) {
          <polygon points="12,2 22.5,22 1.5,22" />
        }
        @case (shapeIds.SQUARE) {
          <rect x="1.5" y="1.5" width="21" height="21" rx="1.5" />
        }
        @case (shapeIds.CIRCLE) {
          <circle cx="12" cy="12" r="10.5" />
        }
        @case (shapeIds.DIAMOND) {
          <polygon points="12,1.5 20.5,12 12,22.5 3.5,12" />
        }
        @case (shapeIds.RECTANGLE) {
          <rect x="1.5" y="6" width="21" height="12" rx="1.5" />
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
}
