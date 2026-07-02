import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';

export type ItemNavState = 'answered' | 'skipped' | 'pending';

@Component({
  selector: 'ui-item-nav-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav
      class="band"
      aria-label="Navigation des items"
      [style.--band-accent]="presentation().plainVar"
    >
      @for (state of states(); track $index) {
        <button
          type="button"
          class="band__item"
          [class.band__item--answered]="state === 'answered'"
          [class.band__item--skipped]="state === 'skipped'"
          [class.band__item--current]="$index === currentIndex()"
          [attr.aria-current]="$index === currentIndex() ? 'true' : null"
          [attr.aria-label]="ariaLabel($index, state)"
          (click)="navigate.emit($index)"
        >
          <span class="band__dot"></span>
        </button>
      }
    </nav>
  `,
  styleUrl: './item-nav-band.css',
})
export class ItemNavBand {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly states = input.required<ItemNavState[]>();
  readonly currentIndex = input.required<number>();
  readonly axis = input.required<AxisType>();
  readonly navigate = output<number>();

  protected readonly presentation = computed(() => AXIS_PRESENTATION[this.axis()]);

  constructor() {
    effect(() => {
      this.currentIndex();
      setTimeout(() =>
        this.elementRef.nativeElement
          .querySelector('[aria-current="true"]')
          ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' }),
      );
    });
  }

  protected ariaLabel(index: number, state: ItemNavState): string {
    return `Item ${index + 1} — ${state === 'answered' ? 'répondu' : 'non répondu'}`;
  }
}
