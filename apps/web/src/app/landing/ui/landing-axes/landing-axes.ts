import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LandingReveal } from '../landing-reveal.directive';

interface LandingAxis {
  name: string;
  description: string;
  plainVar: string;
  textVar: string;
  paths: string[];
  circle: { cx: number; cy: number; r: number } | null;
}

const LOGIC_PATH =
  'M19.439 7.85c-.049.322.059.648.289.878l1.568 1.568c.47.47.706 1.087.706 1.704s-.235 1.233-.706 1.704l-1.611 1.611a.98.98 0 0 1-.837.276c-.47-.07-.802-.48-.968-.925a2.501 2.501 0 1 0-3.214 3.214c.446.166.855.497.925.968a.979.979 0 0 1-.276.837l-1.61 1.61a2.404 2.404 0 0 1-1.705.707 2.402 2.402 0 0 1-1.704-.706l-1.568-1.568a1.026 1.026 0 0 0-.877-.29c-.493.074-.84.504-1.02.968a2.5 2.5 0 1 1-3.237-3.237c.464-.18.894-.527.967-1.02a1.026 1.026 0 0 0-.289-.877l-1.568-1.568A2.402 2.402 0 0 1 1.998 12c0-.617.236-1.234.706-1.704L4.23 8.77c.24-.24.581-.353.917-.303.515.077.877.528 1.073 1.01a2.5 2.5 0 1 0 3.259-3.259c-.482-.196-.933-.558-1.01-1.073-.05-.336.062-.676.303-.917l1.525-1.525A2.402 2.402 0 0 1 12 1.998c.617 0 1.234.236 1.704.706l1.568 1.568c.23.23.556.338.877.29.493-.074.84-.504 1.02-.968a2.5 2.5 0 1 1 3.237 3.237c-.464.18-.894.527-.967 1.02Z';

const LANDING_AXES: LandingAxis[] = [
  {
    name: 'Logique',
    description:
      "Identifier la règle d'une suite et la prolonger, vite et sans erreur.",
    plainVar: 'var(--axis-logic)',
    textVar: 'var(--axis-logic-text)',
    paths: [LOGIC_PATH, 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'],
    circle: null,
  },
  {
    name: 'Mémoire',
    description:
      "Retenir une séquence et la restituer dans l'ordre demandé, y compris inversé.",
    plainVar: 'var(--axis-memory)',
    textVar: 'var(--axis-memory-text)',
    paths: [
      'M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z',
      'M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z',
    ],
    circle: null,
  },
  {
    name: 'Discrimination visuelle',
    description:
      'Comparer deux suites et repérer la moindre différence, sans fausse alerte.',
    plainVar: 'var(--axis-discrimination)',
    textVar: 'var(--axis-discrimination-text)',
    paths: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z'],
    circle: { cx: 12, cy: 12, r: 3 },
  },
  {
    name: 'Réactivité',
    description: 'Réagir vite, au bon moment, avec la bonne commande.',
    plainVar: 'var(--axis-reactivity)',
    textVar: 'var(--axis-reactivity-text)',
    paths: ['M13 2 3 14h9l-1 8 10-12h-9l1-8Z'],
    circle: null,
  },
  {
    name: 'Motricité',
    description:
      'Coordonner les deux mains pour suivre une trajectoire avec précision.',
    plainVar: 'var(--axis-motor)',
    textVar: 'var(--axis-motor-text)',
    paths: [
      'M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2',
      'M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2',
      'M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8',
      'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15',
    ],
    circle: null,
  },
];

@Component({
  selector: 'app-landing-axes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal],
  template: `
    <section class="axes" id="axes">
      <div class="axes__inner">
        <div class="axes__head" appLandingReveal>
          <div class="axes__head-copy">
            <span class="axes__eyebrow">Les axes d'entraînement disponibles</span>
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
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  [attr.stroke]="axis.textVar"
                  stroke-width="1.6"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  @for (d of axis.paths; track d) {
                    <svg:path [attr.d]="d" />
                  }
                  @if (axis.circle; as circle) {
                    <svg:circle
                      [attr.cx]="circle.cx"
                      [attr.cy]="circle.cy"
                      [attr.r]="circle.r"
                    />
                  }
                </svg>
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
}
