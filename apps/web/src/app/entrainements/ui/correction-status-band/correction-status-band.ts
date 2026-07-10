import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';

export interface StatusBandEntry {
  colorVar: string;
  label: string;
}

@Component({
  selector: 'ui-correction-status-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="band">
      <div class="band__dots" role="tablist" aria-label="Exercices de la session">
        @for (dot of dots(); track $index) {
          <button
            type="button"
            class="band__dot"
            [class.band__dot--current]="$index === currentIndex()"
            [style.background]="dot.colorVar"
            [attr.aria-label]="'Exercice ' + ($index + 1) + ' · ' + dot.label"
            [attr.aria-current]="$index === currentIndex() ? 'true' : null"
            (click)="navigate.emit($index)"
          ></button>
        }
      </div>
      <div class="band__legend">
        @for (entry of legend(); track entry.label) {
          <span class="band__legend-item">
            <span
              class="band__legend-dot"
              [style.background]="entry.colorVar"
            ></span>
            {{ entry.label }}
          </span>
        }
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
      background: var(--card);
      border-bottom: 1px solid var(--border);
    }
    .band {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      max-width: 1152px;
      margin: 0 auto;
      padding: 12px 24px;
    }
    .band__dots {
      display: flex;
      align-items: center;
      flex-wrap: nowrap;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 4px;
    }
    .band__dots::-webkit-scrollbar {
      display: none;
    }
    .band__dot {
      width: 11px;
      height: 11px;
      flex-shrink: 0;
      border: none;
      border-radius: var(--radius-pill);
      padding: 0;
      cursor: pointer;
    }
    .band__dot--current {
      box-shadow:
        0 0 0 2px var(--card),
        0 0 0 4px var(--ink);
    }
    .band__dot:focus-visible {
      outline: none;
      box-shadow:
        0 0 0 2px var(--card),
        0 0 0 4px var(--brand);
    }
    .band__legend {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }
    .band__legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font: 500 11px/14px var(--font-ui);
      color: var(--text-secondary);
      white-space: nowrap;
    }
    .band__legend-dot {
      width: 7px;
      height: 7px;
      border-radius: var(--radius-pill);
    }
    @media (max-width: 767px) {
      .band {
        flex-direction: column;
        gap: 6px;
        padding: 10px 16px;
      }
      .band__dots {
        max-width: 100%;
      }
    }
  `,
})
export class CorrectionStatusBand {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly dots = input.required<StatusBandEntry[]>();
  readonly legend = input.required<StatusBandEntry[]>();
  readonly currentIndex = input.required<number>();
  readonly navigate = output<number>();

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
}
