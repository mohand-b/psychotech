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
    <span class="sector" title="Votre secteur de préparation">
      @if (showLabel()) {
        <span class="sector__label">Secteur</span>
      }
      <span class="sector__name">
        <ui-icon class="sector__icon" [img]="presentation().icon" [size]="14" />
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
  `,
})
export class SectorChip {
  readonly sector = input.required<Sector>();
  readonly showLabel = input(true);

  protected readonly presentation = computed(
    () => SECTOR_PRESENTATION[this.sector()],
  );
}
