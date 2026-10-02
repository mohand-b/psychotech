import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SECTOR_LINEUP } from '../../../shared/ui/sector-presentation';
import { LANDING_SECTOR } from '../../data/landing-axes';

@Component({
  selector: 'app-landing-sectors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sectors" aria-label="Secteurs">
      <div class="sectors__inner">
        <span class="sectors__eyebrow">Une épreuve par secteur</span>
        <ul class="sectors__list">
          @for (entry of lineup; track entry.sector) {
            <li
              class="sectors__item"
              [class.sectors__item--available]="
                entry.sector === availableSector
              "
            >
              {{ entry.label }}
            </li>
          }
        </ul>
      </div>
    </section>
  `,
  styles: `
    .sectors {
      border-top: 1px solid var(--landing-rule);
    }
    .sectors__inner {
      max-width: var(--landing-container-width);
      margin: 0 auto;
      padding: 26px var(--landing-gutter);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
    }
    .sectors__eyebrow {
      font: 600 11px / normal var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      white-space: nowrap;
      color: var(--landing-accent-soft);
    }
    .sectors__list {
      display: flex;
      align-items: center;
    }
    .sectors__item {
      padding: 0 18px;
      border-left: 1px solid var(--landing-border);
      font: 600 16px/1 var(--landing-font-display);
      color: var(--landing-text-dim);
    }
    .sectors__item:first-child {
      padding-left: 0;
      border-left: none;
    }
    .sectors__item:last-child {
      padding-right: 0;
    }
    .sectors__item--available {
      color: var(--landing-text);
    }
    @media (max-width: 1023px) {
      .sectors__inner {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
        padding: 22px var(--landing-gutter);
      }
      .sectors__list {
        flex-wrap: wrap;
      }
      .sectors__item,
      .sectors__item:first-child,
      .sectors__item:last-child {
        padding: 0;
        border-left: none;
        line-height: 1.7;
      }
      .sectors__item:not(:last-child)::after {
        content: '·' / '';
        padding: 0 10px;
        color: var(--landing-dot);
      }
    }
  `,
})
export class LandingSectors {
  protected readonly lineup = SECTOR_LINEUP;
  protected readonly availableSector = LANDING_SECTOR;
}
