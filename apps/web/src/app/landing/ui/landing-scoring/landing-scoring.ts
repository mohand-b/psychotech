import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LandingReveal } from '../landing-reveal.directive';

@Component({
  selector: 'app-landing-scoring',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal],
  template: `
    <section class="scoring">
      <div class="scoring__inner">
        <div class="scoring__head" appLandingReveal>
          <div class="scoring__head-copy">
            <span class="scoring__eyebrow">Le scoring</span>
            <h2 class="scoring__title">
              Une notation aussi exigeante que l'épreuve réelle
            </h2>
          </div>
          <p class="scoring__intro">
            Votre score n'est pas un pourcentage de bonnes réponses&nbsp;: il
            est construit comme celui d'une vraie sélection.
          </p>
        </div>
        <div class="scoring__grid" appLandingReveal="0.1s">
          <div class="scoring__item">
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--landing-accent-soft)"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span class="scoring__item-title">Des métriques multiples</span>
            <span class="scoring__item-text"
              >Précision, temps de réponse, régularité, erreurs, gestion du
              temps&nbsp;: chaque exercice est évalué sur l'ensemble de ses
              observables.</span
            >
          </div>
          <div class="scoring__item">
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--landing-accent-soft)"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="19" y1="5" x2="5" y2="19"></line>
              <circle cx="6.5" cy="6.5" r="2.5"></circle>
              <circle cx="17.5" cy="17.5" r="2.5"></circle>
            </svg>
            <span class="scoring__item-title"
              >Un score lisible, sur <span class="t-mono">100</span></span
            >
            <span class="scoring__item-text"
              >Toutes les métriques sont ramenées à un score sur 100 par axe,
              comparable d'une session à l'autre.</span
            >
          </div>
          <div class="scoring__item">
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--landing-accent-soft)"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <line x1="21" x2="14" y1="4" y2="4"></line>
              <line x1="10" x2="3" y1="4" y2="4"></line>
              <line x1="21" x2="12" y1="12" y2="12"></line>
              <line x1="8" x2="3" y1="12" y2="12"></line>
              <line x1="21" x2="16" y1="20" y2="20"></line>
              <line x1="12" x2="3" y1="20" y2="20"></line>
              <line x1="14" x2="14" y1="2" y2="6"></line>
              <line x1="8" x2="8" y1="10" y2="14"></line>
              <line x1="16" x2="16" y1="18" y2="22"></line>
            </svg>
            <span class="scoring__item-title">Pondéré selon votre secteur</span>
            <span class="scoring__item-text"
              >Chaque axe pèse selon son importance réelle dans l'épreuve de
              votre secteur, d'après ses barèmes.</span
            >
          </div>
          <div class="scoring__item">
            <svg
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fbc979"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path
                d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"
              ></path>
              <path d="M12 9v4"></path>
              <path d="M12 17h.01"></path>
            </svg>
            <span class="scoring__item-title">Axes critiques et seuils</span>
            <span class="scoring__item-text"
              >Comme en sélection réelle&nbsp;: un axe critique sous son seuil
              éliminatoire rend l'avis défavorable, quel que soit le score
              global.</span
            >
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .scoring {
      background: var(--landing-bg);
    }
    .scoring__inner {
      max-width: 1160px;
      margin: 0 auto;
      padding: 72px 32px;
    }
    .scoring__head {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 32px;
      margin-bottom: 44px;
    }
    .scoring__head-copy {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 560px;
    }
    .scoring__eyebrow {
      font: 600 11px/14px var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--landing-accent-soft);
    }
    .scoring__title {
      font: 600 36px/1.12 var(--landing-font-display);
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--landing-text);
    }
    .scoring__intro {
      font: 400 15px/1.6 var(--landing-font-ui);
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
      max-width: 380px;
      padding-bottom: 4px;
    }
    .scoring__grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 40px;
    }
    .scoring__item {
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-top: 1px solid var(--landing-border);
      padding-top: 22px;
    }
    .scoring__item-title {
      font: 600 15.5px/22px var(--landing-font-ui);
      color: var(--landing-text);
    }
    .scoring__item-text {
      font: 400 13.5px/1.6 var(--landing-font-ui);
      color: rgba(255, 255, 255, 0.55);
    }
    @media (max-width: 767px) {
      .scoring {
        display: none;
      }
    }
  `,
})
export class LandingScoring {}
