import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { Sector } from '@psychotech/shared';
import { Icon } from '../icon/icon';
import { SECTOR_PRESENTATION } from '../sector-presentation';

@Component({
  selector: 'ui-sector-chip',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <span
      class="sector"
      [class.sector--compact]="compact()"
      title="Votre secteur de préparation"
    >
      <span class="sector__label">Secteur</span>
      <span class="sector__name">
        <ui-icon
          class="sector__icon"
          [img]="presentation().icon"
          [size]="compact() ? 12 : 14"
        />
        {{ presentation().label }}
      </span>
    </span>
  `,
  styles: `
    :host {
      display: inline-flex;
    }
    .sector {
      display: inline-flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 2px;
    }
    .sector__label {
      font: 600 10px/14px var(--font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-disabled);
    }
    .sector__name {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font: 600 14px/18px var(--font-ui);
      color: var(--ink);
    }
    .sector__icon {
      color: var(--brand);
    }
    .sector--compact {
      gap: 1px;
    }
    .sector--compact .sector__label {
      font-size: 9px;
      line-height: 12px;
    }
    .sector--compact .sector__name {
      gap: 5px;
      font-size: 11px;
      line-height: 14px;
    }
  `,
})
export class SectorChip {
  readonly sector = input.required<Sector>();
  readonly compact = input(false);

  protected readonly presentation = computed(
    () => SECTOR_PRESENTATION[this.sector()],
  );
}
