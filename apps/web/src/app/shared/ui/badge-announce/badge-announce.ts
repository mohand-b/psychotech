import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { RotateCcw } from 'lucide-angular';
import { AxisIcon } from '../axis-icon/axis-icon';
import { Icon } from '../icon/icon';

export interface BadgeAnnounceThumb {
  assetPath: string;
  name: string;
}

export interface BadgeAnnounceView {
  thumbs: BadgeAnnounceThumb[];
  title: string;
  gain: number | null;
  plainLine: string | null;
}

@Component({
  selector: 'ui-badge-announce',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, Icon],
  template: `
    <button
      type="button"
      class="announce flex items-center"
      title="Revoir la célébration"
      (click)="replay.emit()"
    >
      <span class="announce__thumbs">
        @for (thumb of view().thumbs; track thumb.name) {
          <img
            class="announce__thumb"
            [src]="thumb.assetPath"
            [alt]="thumb.name"
          />
        }
      </span>
      <span class="announce__copy flex flex-col">
        <span class="announce__title">{{ view().title }}</span>
        @if (view().gain; as gain) {
          <span class="announce__gain flex items-center">
            <ui-axis-icon axis="credit" [size]="12" />
            <span
              ><span class="announce__gain-amount t-mono">+{{ gain }}</span>
              crédits ajoutés à votre solde</span
            >
          </span>
        } @else if (view().plainLine; as plainLine) {
          <span class="announce__plain">{{ plainLine }}</span>
        }
      </span>
      <span class="announce__replay">
        <ui-icon [img]="replayIcon" [size]="15" />
      </span>
    </button>
  `,
  styles: `
    :host {
      display: block;
    }
    .announce {
      width: 100%;
      gap: 14px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      padding: 13px 18px;
      box-shadow: var(--shadow-card);
      cursor: pointer;
      text-align: left;
      font-family: var(--font-ui);
      animation: announceIn 420ms cubic-bezier(0.22, 1, 0.36, 1) 120ms backwards;
    }
    .announce:hover {
      border-color: var(--border-hover);
      background: var(--surface-hover);
    }
    @keyframes announceIn {
      from {
        opacity: 0;
        transform: translateY(6px);
      }
    }
    .announce__thumbs {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px;
      max-width: calc(6 * 30px + 5 * 4px);
      flex-shrink: 0;
    }
    .announce__thumb {
      width: 30px;
      height: 30px;
      object-fit: contain;
    }
    .announce__copy {
      gap: 2px;
      flex: 1;
      min-width: 0;
    }
    .announce__title {
      font: 600 13.5px/1.4 var(--font-ui);
      color: var(--ink);
    }
    .announce__gain {
      gap: 5px;
      font: 400 12px/1.4 var(--font-ui);
      color: var(--label);
    }
    .announce__gain-amount {
      font-weight: 600;
      color: var(--text-secondary);
    }
    .announce__plain {
      font: 400 12px/1.4 var(--font-ui);
      color: var(--label);
    }
    .announce__replay {
      width: 36px;
      height: 36px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-disabled);
      flex-shrink: 0;
    }
    @media (prefers-reduced-motion: reduce) {
      .announce {
        animation: none;
      }
    }
  `,
})
export class BadgeAnnounce {
  readonly view = input.required<BadgeAnnounceView>();
  readonly replay = output<void>();

  protected readonly replayIcon = RotateCcw;
}
