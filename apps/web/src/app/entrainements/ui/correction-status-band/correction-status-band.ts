import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { LogicItemStatus } from '@psychotech/shared';
import { LOGIC_STATUS_COLORS, LOGIC_STATUS_LABELS } from '../logic-status';

const LEGEND_STATUSES: LogicItemStatus[] = [
  'CORRECT',
  'WRONG',
  'SKIPPED',
  'UNREACHED',
];

@Component({
  selector: 'ui-correction-status-band',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="band">
      <div class="band__dots" role="tablist" aria-label="Items de la session">
        @for (status of statuses(); track $index) {
          <button
            type="button"
            class="band__dot"
            [class.band__dot--current]="$index === currentIndex()"
            [style.background]="colorFor(status)"
            [attr.aria-label]="'Item ' + ($index + 1) + ' · ' + labelFor(status)"
            [attr.aria-current]="$index === currentIndex() ? 'true' : null"
            (click)="navigate.emit($index)"
          ></button>
        }
      </div>
      <div class="band__legend">
        @for (status of legendStatuses; track status) {
          <span class="band__legend-item">
            <span
              class="band__legend-dot"
              [style.background]="colorFor(status)"
            ></span>
            {{ labelFor(status).toLowerCase() }}
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
      padding: 4px;
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
  readonly statuses = input.required<LogicItemStatus[]>();
  readonly currentIndex = input.required<number>();
  readonly navigate = output<number>();

  protected readonly legendStatuses = LEGEND_STATUSES;

  protected colorFor(status: LogicItemStatus): string {
    return LOGIC_STATUS_COLORS[status];
  }

  protected labelFor(status: LogicItemStatus): string {
    return LOGIC_STATUS_LABELS[status];
  }
}
