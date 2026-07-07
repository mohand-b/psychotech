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
      fill="currentColor"
      aria-hidden="true"
      [style.transform]="'rotate(' + rotation() + 'deg)'"
    >
      @switch (shape()) {
        @case (shapeIds.TRIANGLE) {
          <polygon points="12,3 21.5,20 2.5,20" />
        }
        @case (shapeIds.SQUARE) {
          <rect x="4.5" y="4.5" width="15" height="15" rx="1.5" />
        }
        @case (shapeIds.CIRCLE) {
          <circle cx="12" cy="12" r="8.5" />
        }
        @case (shapeIds.DIAMOND) {
          <polygon points="12,2 19,12 12,22 5,12" />
        }
        @case (shapeIds.RECTANGLE) {
          <rect x="2.5" y="7" width="19" height="10" rx="1.5" />
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

  protected readonly shapeIds = ShapeId;
}
