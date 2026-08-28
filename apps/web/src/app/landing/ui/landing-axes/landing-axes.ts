import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AxisType } from '@psychotech/shared';
import {
  AXIS_ICON_SIZE,
  AxisIcon,
} from '../../../shared/ui/axis-icon/axis-icon';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { LandingReveal } from '../landing-reveal.directive';

interface LandingAxisCopy {
  axis: AxisType;
  name: string;
  description: string;
}

interface LandingAxis extends LandingAxisCopy {
  plainVar: string;
}

const LANDING_AXES_COPY: LandingAxisCopy[] = [
  {
    axis: AxisType.VISUAL_DISCRIMINATION,
    name: 'Discrimination visuelle',
    description:
      'Comparer deux suites et repérer la moindre différence, sans fausse alerte.',
  },
  {
    axis: AxisType.LOGIC,
    name: 'Logique',
    description:
      "Identifier la règle d'une suite et la prolonger, vite et sans erreur.",
  },
  {
    axis: AxisType.MEMORY,
    name: 'Mémoire',
    description:
      "Retenir une séquence et la restituer dans l'ordre demandé, y compris inversé.",
  },
  {
    axis: AxisType.MOTOR_SKILLS,
    name: 'Motricité',
    description:
      'Coordonner les deux mains pour suivre une trajectoire avec précision.',
  },
  {
    axis: AxisType.REACTIVITY,
    name: 'Réactivité',
    description: 'Réagir vite, au bon moment, avec la bonne commande.',
  },
];

const LANDING_AXES: LandingAxis[] = LANDING_AXES_COPY.map((entry) => ({
  ...entry,
  plainVar: AXIS_PRESENTATION[entry.axis].plainVar,
}));

@Component({
  selector: 'app-landing-axes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisIcon, LandingReveal],
  template: `
    <section class="axes" id="axes">
      <div class="axes__inner">
        <div class="axes__head" appLandingReveal>
          <div class="axes__head-copy">
            <span class="axes__eyebrow"
              >Les axes d'entraînement disponibles</span
            >
            <h2 class="axes__title">Chaque capacité s'entraîne, une à une</h2>
          </div>
          <p class="axes__intro">
            Chaque secteur évalue une combinaison de capacités. Votre secteur
            active les axes de son épreuve, avec ses propres barèmes.
          </p>
        </div>
        <div class="axes__list">
          @for (axis of axes; track axis.name) {
            <div class="axes__row" appLandingReveal>
              <span
                class="axes__row-icon"
                [style.border-bottom-color]="axis.plainVar"
              >
                <ui-axis-icon [axis]="axis.axis" [size]="cardIconSize" />
              </span>
              <span class="axes__row-name">{{ axis.name }}</span>
              <span class="axes__row-desc">{{ axis.description }}</span>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .axes {
      background: var(--card);
      border-top: 1px solid var(--border);
      scroll-margin-top: calc(64px + env(safe-area-inset-top));
    }
    .axes__inner {
      max-width: 1160px;
      margin: 0 auto;
      padding: 64px 32px;
    }
    .axes__head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 32px;
      margin-bottom: 32px;
    }
    .axes__head-copy {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 560px;
    }
    .axes__eyebrow {
      font: 600 11px/14px var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--label);
    }
    .axes__title {
      font: 600 36px/1.12 var(--landing-font-display);
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--ink);
    }
    .axes__intro {
      font: 400 15px/1.6 var(--landing-font-ui);
      color: var(--text-secondary);
      margin: 0;
      max-width: 380px;
      padding-bottom: 4px;
    }
    .axes__list {
      display: flex;
      flex-direction: column;
    }
    .axes__row {
      display: grid;
      grid-template-columns: 44px 300px 1fr;
      gap: 22px;
      align-items: center;
      padding: 18px 0;
      border-top: 1px solid var(--border);
    }
    .axes__row:last-child {
      border-bottom: 1px solid var(--border);
    }
    .axes__row:hover {
      background: var(--surface-hover);
    }
    .axes__row-icon {
      width: 34px;
      height: 34px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-bottom: 2px solid;
    }
    .axes__row-name {
      font: 600 19px/26px var(--landing-font-display);
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .axes__row-desc {
      font: 400 15px/1.6 var(--landing-font-ui);
      color: var(--text-secondary);
    }
    @media (max-width: 767px) {
      .axes__inner {
        padding: 52px 20px;
      }
      .axes__head {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
        margin-bottom: 28px;
      }
      .axes__head-copy {
        gap: 12px;
      }
      .axes__title {
        font-size: 26px;
        line-height: 1.15;
      }
      .axes__intro {
        font-size: 13.5px;
        max-width: none;
        padding-bottom: 0;
      }
      .axes__row {
        grid-template-columns: 32px 1fr;
        gap: 4px 14px;
        align-items: start;
        padding: 16px 0;
      }
      .axes__row:last-child {
        border-bottom: none;
      }
      .axes__row-icon {
        width: 32px;
        height: 32px;
        grid-row: 1 / span 2;
      }
      .axes__row-name {
        grid-column: 2;
        font-size: 16.5px;
        line-height: 22px;
      }
      .axes__row-desc {
        grid-column: 2;
        font-size: 13.5px;
        line-height: 1.55;
      }
    }
  `,
})
export class LandingAxes {
  protected readonly axes = LANDING_AXES;
  protected readonly cardIconSize = AXIS_ICON_SIZE.card;
}
