import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { DominoFace, DominoTile as DominoTileSpec } from '@psychotech/shared';
import { DominoTile } from './domino-tile';

export type DominoHalf = 'top' | 'bottom';

export interface DominoGapAnnotation {
  top: string;
  bottom: string;
}

@Component({
  selector: 'ui-domino-sequence',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DominoTile],
  template: `
    <div class="seq">
      @for (tile of tiles(); track $index) {
        <ui-domino-tile
          [top]="tile.top"
          [bottom]="tile.bottom"
          [width]="tileWidth()"
        />
        @if (annotations(); as notes) {
          <span class="seq__gap t-mono">
            <span>{{ notes[$index].top }}</span>
            <span>{{ notes[$index].bottom }}</span>
          </span>
        }
      }
      <div class="seq__answer">
        <ui-domino-tile
          [top]="answerTop()"
          [bottom]="answerBottom()"
          [width]="tileWidth()"
        />
        <button
          type="button"
          class="seq__zone seq__zone--top"
          [class.seq__zone--active]="activeHalf() === 'top'"
          (click)="pickHalf.emit('top')"
          aria-label="Face du haut"
        ></button>
        <button
          type="button"
          class="seq__zone seq__zone--bottom"
          [class.seq__zone--active]="activeHalf() === 'bottom'"
          (click)="pickHalf.emit('bottom')"
          aria-label="Face du bas"
        ></button>
      </div>
    </div>
  `,
  styles: `
    .seq {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .seq__gap {
      display: flex;
      flex-direction: column;
      gap: 26px;
      font-size: 11px;
      color: var(--brand-hover);
      min-width: 22px;
      text-align: center;
    }
    .seq__answer {
      position: relative;
      display: inline-flex;
    }
    .seq__zone {
      position: absolute;
      left: 0;
      width: 100%;
      height: 50%;
      background: transparent;
      border: 2px dashed transparent;
      border-radius: 8px;
      cursor: pointer;
      padding: 0;
    }
    .seq__zone--top {
      top: 0;
    }
    .seq__zone--bottom {
      bottom: 0;
    }
    .seq__zone--active {
      border-color: var(--brand);
      background: color-mix(in srgb, var(--brand) 8%, transparent);
    }
  `,
})
export class DominoSequence {
  readonly tiles = input.required<readonly DominoTileSpec[]>();
  readonly answerTop = input.required<DominoFace | null>();
  readonly answerBottom = input.required<DominoFace | null>();
  readonly activeHalf = input<DominoHalf>('top');
  readonly annotations = input<readonly DominoGapAnnotation[] | null>(null);
  readonly tileWidth = input(60);

  readonly pickHalf = output<DominoHalf>();
}
