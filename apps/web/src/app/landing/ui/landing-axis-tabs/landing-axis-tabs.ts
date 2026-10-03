import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChildren,
} from '@angular/core';
import { AxisType } from '@psychotech/shared';
import {
  AXIS_ICON_SIZE,
  AxisIcon,
} from '../../../shared/ui/axis-icon/axis-icon';
import { LandingAxis } from '../../data/landing-axes';
import { computeTabIndexAfterKey } from '../../util/tab-navigation';

export const LANDING_AXIS_PANEL_ID = 'landing-axis-panel';

export function buildLandingAxisTabId(axis: AxisType): string {
  return `landing-axis-tab-${axis}`;
}

@Component({
  selector: 'app-landing-axis-tabs',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon],
  template: `
    <div class="tabs" role="tablist" [attr.aria-label]="label()">
      @for (axis of axes(); track axis.axis; let index = $index) {
        <button
          #tab
          type="button"
          role="tab"
          class="tabs__tab"
          [class.tabs__tab--active]="index === selected()"
          [id]="buildLandingAxisTabId(axis.axis)"
          [attr.aria-selected]="index === selected()"
          [attr.aria-controls]="panelId"
          [attr.tabindex]="index === selected() ? 0 : -1"
          [style.--axis-color]="axis.colorVar"
          (click)="selected.set(index)"
          (keydown)="selectTabWithKeyboard($event)"
        >
          <ui-axis-icon
            class="tabs__icon"
            [axis]="axis.axis"
            [size]="iconSize"
          />
          <span class="tabs__label">{{ axis.label }}</span>
          <span class="tabs__label tabs__label--short">{{
            axis.shortLabel
          }}</span>
          <span class="tabs__underline" aria-hidden="true"></span>
        </button>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .tabs {
      display: flex;
      align-items: stretch;
      border-bottom: 1px solid var(--border);
    }
    .tabs__tab {
      position: relative;
      flex: 1;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 8px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font: 600 16px / normal var(--landing-font-display);
      letter-spacing: -0.01em;
      color: var(--label);
      transition: color 0.25s ease;
    }
    .tabs__tab--active {
      color: var(--ink);
    }
    .tabs__icon {
      opacity: 0.5;
      transition: opacity 0.25s ease;
    }
    .tabs__tab--active .tabs__icon {
      opacity: 1;
    }
    .tabs__underline {
      position: absolute;
      right: 0;
      bottom: -1px;
      left: 0;
      height: 2px;
      background: var(--axis-color);
      transform: scaleX(0);
      transform-origin: center;
      transition: transform 0.3s var(--ease-glide);
    }
    .tabs__tab--active .tabs__underline {
      transform: scaleX(1);
    }
    .tabs__label--short {
      display: none;
    }
    @media (max-width: 1023px) {
      .tabs {
        flex-wrap: wrap;
        gap: 8px;
        border-bottom: none;
      }
      .tabs__tab {
        flex: none;
        height: 40px;
        gap: 8px;
        padding: 0 14px;
        border: 1px solid var(--border);
        border-radius: var(--landing-radius-round);
        background: var(--card);
        font: 600 13.5px / normal var(--landing-font-ui);
        letter-spacing: normal;
        color: var(--ink);
        white-space: nowrap;
        transition:
          background 0.2s ease,
          border-color 0.2s ease,
          color 0.2s ease;
      }
      .tabs__tab--active {
        border-color: var(--ink);
        background: var(--ink);
        color: var(--card);
      }
      .tabs__icon {
        width: 15px !important;
        height: 15px !important;
        opacity: 1;
      }
      .tabs__tab--active .tabs__icon {
        filter: brightness(0) invert(1);
      }
      .tabs__label {
        display: none;
      }
      .tabs__label--short {
        display: inline;
      }
      .tabs__underline {
        display: none;
      }
    }
  `,
})
export class LandingAxisTabs {
  readonly axes = input.required<readonly LandingAxis[]>();
  readonly label = input.required<string>();
  readonly selected = model(0);

  private readonly tabs = viewChildren<ElementRef<HTMLButtonElement>>('tab');

  protected readonly iconSize = AXIS_ICON_SIZE.tab;
  protected readonly panelId = LANDING_AXIS_PANEL_ID;
  protected readonly buildLandingAxisTabId = buildLandingAxisTabId;

  protected selectTabWithKeyboard(event: KeyboardEvent): void {
    const next = computeTabIndexAfterKey(
      event.key,
      this.selected(),
      this.axes().length,
    );
    if (next === null) {
      return;
    }
    event.preventDefault();
    this.selected.set(next);
    this.tabs()[next]?.nativeElement.focus();
  }
}
