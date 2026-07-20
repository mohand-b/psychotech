import {
  ChangeDetectionStrategy,
  Component,
  input,
} from '@angular/core';

export type LogicHeadIcon = 'series' | 'domino' | 'matrix';

@Component({
  selector: 'ui-logic-item-head',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="head">
      <div class="head__lead">
        <span class="head__badge">
          @switch (icon()) {
            @case ('domino') {
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect x="8" y="2.5" width="8" height="19" rx="2.5"></rect>
                <line x1="8" y1="12" x2="16" y2="12"></line>
                <circle
                  cx="12"
                  cy="7.2"
                  r="1.3"
                  fill="currentColor"
                  stroke="none"
                ></circle>
                <circle
                  cx="10.4"
                  cy="15.6"
                  r="1.3"
                  fill="currentColor"
                  stroke="none"
                ></circle>
                <circle
                  cx="13.6"
                  cy="18.3"
                  r="1.3"
                  fill="currentColor"
                  stroke="none"
                ></circle>
              </svg>
            }
            @case ('matrix') {
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="M3 9h18"></path>
                <path d="M3 15h18"></path>
                <path d="M9 3v18"></path>
                <path d="M15 3v18"></path>
              </svg>
            }
            @default {
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="4" x2="20" y1="9" y2="9"></line>
                <line x1="4" x2="20" y1="15" y2="15"></line>
                <line x1="10" x2="8" y1="3" y2="21"></line>
                <line x1="16" x2="14" y1="3" y2="21"></line>
              </svg>
            }
          }
          {{ label() }}
        </span>
        <span class="head__consigne">{{ consigne() }}</span>
      </div>
      <span class="head__count t-mono">{{ current() }}/{{ total() }}</span>
    </header>
  `,
  styles: `
    :host {
      display: block;
      width: 100%;
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .head__lead {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .head__badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      flex-shrink: 0;
      background: var(--axis-pastel);
      border: 1px solid var(--axis-pastel-bd);
      color: var(--axis-text);
      font: 600 12px/16px var(--font-ui);
      padding: 5px 10px;
      border-radius: var(--radius-chip);
    }
    .head__consigne {
      font: 400 13px/18px var(--font-ui);
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .head__count {
      flex-shrink: 0;
      font-size: 13px;
      font-weight: 500;
      color: var(--label);
    }
    @media (max-width: 767px) {
      .head {
        flex-direction: column;
        align-items: center;
        gap: 10px;
        text-align: center;
      }
      .head__consigne {
        white-space: normal;
        line-height: 1.5;
      }
      .head__count {
        display: none;
      }
    }
  `,
})
export class LogicItemHead {
  readonly icon = input.required<LogicHeadIcon>();
  readonly label = input.required<string>();
  readonly consigne = input.required<string>();
  readonly current = input.required<number>();
  readonly total = input.required<number>();
}
