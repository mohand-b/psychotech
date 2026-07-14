import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LandingReveal } from '../landing-reveal.directive';

@Component({
  selector: 'app-landing-platform',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal],
  template: `
    <section class="platform">
      <div class="platform__inner">
        <div class="platform__head" appLandingReveal>
          <span class="platform__eyebrow">La plateforme</span>
          <h2 class="platform__title">
            Tout ce qu'il faut pour arriver prêt le jour J
          </h2>
        </div>
        <div class="platform__grid" appLandingReveal="0.1s">
          <div class="platform__item">
            <svg
              class="platform__icon"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--landing-accent)"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span class="platform__item-title">Conditions réelles d'examen</span>
            <span class="platform__item-text"
              >Format, minutage et pression du test officiel, reproduits à
              l'identique.</span
            >
          </div>
          <div class="platform__item">
            <svg
              class="platform__icon"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--landing-accent)"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
              <path d="m19 9-5 5-4-4-3 3"></path>
            </svg>
            <span class="platform__item-title">Scoring calibré par secteur</span>
            <span class="platform__item-text"
              >Seuil d'admissibilité, axes critiques et pondérations propres à
              votre épreuve.</span
            >
          </div>
          <div class="platform__item">
            <svg
              class="platform__icon"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--landing-accent)"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M10 2h4"></path>
              <path d="m4.6 11 8-8"></path>
              <path d="M9 11h6"></path>
              <rect width="16" height="10" x="4" y="11" rx="2"></rect>
              <path d="M8 15h.01"></path>
              <path d="M12 15h.01"></path>
              <path d="M16 15h.01"></path>
            </svg>
            <span class="platform__item-title">Résultats détaillés</span>
            <span class="platform__item-text"
              >Score par axe, correction de vos réponses et recommandations
              priorisées.</span
            >
          </div>
          <div class="platform__item">
            <svg
              class="platform__icon"
              width="21"
              height="21"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--landing-accent)"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
              <polyline points="16 7 22 7 22 13"></polyline>
            </svg>
            <span class="platform__item-title">Suivi de progression</span>
            <span class="platform__item-text"
              >Courbe d'évolution et comparaison de vos sessions dans le
              temps.</span
            >
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .platform {
      background: var(--card);
    }
    .platform__inner {
      max-width: 1160px;
      margin: 0 auto;
      padding: 72px 32px 64px;
    }
    .platform__head {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 40px;
      max-width: 620px;
    }
    .platform__eyebrow {
      font: 600 11px/14px var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--label);
    }
    .platform__title {
      font: 600 36px/1.12 var(--landing-font-display);
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--ink);
    }
    .platform__grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 40px;
    }
    .platform__item {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .platform__item-title {
      font: 600 15.5px/22px var(--landing-font-ui);
      color: var(--ink);
    }
    .platform__item-text {
      font: 400 13.5px/1.6 var(--landing-font-ui);
      color: var(--text-secondary);
    }
    @media (max-width: 767px) {
      .platform__inner {
        padding: 60px 20px 52px;
      }
      .platform__head {
        gap: 12px;
        margin-bottom: 32px;
      }
      .platform__title {
        font-size: 26px;
        line-height: 1.15;
      }
      .platform__grid {
        grid-template-columns: 1fr 1fr;
        gap: 28px 20px;
      }
      .platform__item {
        gap: 10px;
      }
      .platform__icon {
        width: 20px;
        height: 20px;
      }
      .platform__item-title {
        font-size: 14px;
        line-height: 20px;
      }
      .platform__item-text {
        font-size: 12.5px;
        line-height: 1.55;
      }
    }
  `,
})
export class LandingPlatform {}
