import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { DiscriminationElement } from '@psychotech/shared';
import { Shape } from '../shape/shape';

@Component({
  selector: 'ui-element-sequence',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Shape],
  template: `
    <div
      class="sequence t-mono"
      [style.font-size.px]="size()"
      [style.gap.px]="gap()"
    >
      @for (element of elements(); track $index) {
        @if (element.kind === 'CHAR') {
          <span class="sequence__char">{{ element.value }}</span>
        } @else {
          <ui-shape
            [shape]="element.shape"
            [rotation]="element.rotation"
            [size]="shapeSize()"
            [strokeWidth]="shapeStrokeWidth()"
          />
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .sequence {
      display: inline-flex;
      align-items: center;
      font-weight: 600;
      color: var(--ink);
    }
    .sequence__char {
      line-height: 1;
    }
  `,
})
export class ElementSequence {
  readonly elements = input.required<DiscriminationElement[]>();
  readonly size = input(28);
  readonly gap = input(10);
  readonly shapeStrokeWidth = input(2.5);

  protected readonly shapeSize = computed(() => Math.round(this.size() * 0.75));
}
