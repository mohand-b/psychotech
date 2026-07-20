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

export interface ItemNavSegment {
  label: string;
}

interface RenderedSegment {
  label: string;
  start: number;
  end: number;
  states: ItemNavState[];
}

@Component({
  selector: 'ui-item-nav-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="band"
      [style.--band-accent]="presentation().plainVar"
      [style.--band-pastel]="presentation().pastelVar"
      [style.--band-pastel-bd]="presentation().pastelBorderVar"
    >
      <div class="band__meta">
        <span class="band__position"
          >Item
          <strong class="t-mono"
            >{{ currentIndex() + 1 }}/{{ states().length }}</strong
          ></span
        >
        @if (clockLabel(); as clock) {
          <span class="band__timer" title="Temps restant de l'exercice">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="band__timer-value t-mono">{{ clock }}</span>
          </span>
        }
      </div>
      @if (renderedSegments(); as groups) {
        <nav
          class="band__items band__items--segmented"
          aria-label="Navigation des items"
        >
          @for (group of groups; track group.label) {
            <div
              class="band__group"
              [class.band__group--active]="
                currentIndex() >= group.start && currentIndex() <= group.end
              "
              [attr.title]="groupTitle(group)"
            >
              @for (state of group.states; track $index) {
                <button
                  type="button"
                  class="band__seg"
                  [class.band__seg--answered]="state === 'answered'"
                  [class.band__seg--skipped]="state === 'skipped'"
                  [class.band__seg--current]="
                    group.start + $index === currentIndex()
                  "
                  [attr.aria-current]="
                    group.start + $index === currentIndex() ? 'true' : null
                  "
                  [attr.title]="'Item ' + (group.start + $index + 1)"
                  [attr.aria-label]="ariaLabel(group.start + $index, state)"
                  (click)="navigate.emit(group.start + $index)"
                ></button>
              }
            </div>
          }
        </nav>
      } @else {
        <nav class="band__items" aria-label="Navigation des items">
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
              <span class="band__tip t-mono" aria-hidden="true"
                >{{ $index + 1 }}/{{ states().length }}</span
              >
            </button>
          }
        </nav>
      }
      <span class="band__remaining t-mono"
        >{{ remainingCount() }} restants</span
      >
    </div>
  `,
  styleUrl: './item-nav-band.css',
})
export class ItemNavBand {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly states = input.required<ItemNavState[]>();
  readonly currentIndex = input.required<number>();
  readonly axis = input.required<AxisType>();
  readonly remainingCount = input.required<number>();
  readonly segments = input<ItemNavSegment[] | null>(null);
  readonly remainingSec = input<number | null>(null);
  readonly navigate = output<number>();

  protected readonly presentation = computed(
    () => AXIS_PRESENTATION[this.axis()],
  );

  protected readonly clockLabel = computed<string | null>(() => {
    const remaining = this.remainingSec();
    if (remaining === null) {
      return null;
    }
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  });

  protected readonly renderedSegments = computed<RenderedSegment[] | null>(
    () => {
      const segments = this.segments();
      const states = this.states();
      if (!segments || segments.length === 0 || states.length === 0) {
        return null;
      }
      const size = Math.ceil(states.length / segments.length);
      return segments.map((segment, position) => {
        const start = position * size;
        const groupStates = states.slice(start, start + size);
        return {
          label: segment.label,
          start,
          end: start + groupStates.length - 1,
          states: groupStates,
        };
      });
    },
  );

  constructor() {
    effect(() => {
      this.currentIndex();
      setTimeout(() =>
        this.elementRef.nativeElement
          .querySelector('[aria-current="true"]')
          ?.scrollIntoView({
            block: 'nearest',
            inline: 'center',
            behavior: 'smooth',
          }),
      );
    });
  }

  protected groupTitle(group: RenderedSegment): string {
    return `${group.label} · items ${group.start + 1} à ${group.end + 1}`;
  }

  protected ariaLabel(index: number, state: ItemNavState): string {
    return `Item ${index + 1} - ${state === 'answered' ? 'répondu' : 'non répondu'}`;
  }
}
