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
          <span class="platform__eyebrow platform__eyebrow--desktop"
            >La plateforme</span
          >
          <span class="platform__eyebrow platform__eyebrow--mobile"
            >Ce que la plateforme permet</span
          >
          <h2 class="platform__title platform__title--desktop">
            Tout ce qu'il faut pour arriver prêt le jour J
          </h2>
          <h2 class="platform__title platform__title--mobile">
            Tout ce qu'il faut pour arriver prêt
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
        <div class="platform__cards">
          <div class="platform__card">
            <span class="platform__card-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--landing-accent)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="M3 9h18"></path>
                <path d="M9 21V9"></path>
              </svg>
            </span>
            <span class="platform__card-copy">
              <span class="platform__card-title"
                >Conditions réelles d'examen</span
              >
              <span class="platform__card-text"
                >Format, minutage et pression du test officiel.</span
              >
            </span>
          </div>
          <div class="platform__card">
            <span class="platform__card-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--landing-accent)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
                <path d="m19 9-5 5-4-4-3 3"></path>
              </svg>
            </span>
            <span class="platform__card-copy">
              <span class="platform__card-title"
                >Scoring rigoureux par secteur</span
              >
              <span class="platform__card-text"
                >Notation pondérée : seuil d'admissibilité et axes
                critiques.</span
              >
            </span>
          </div>
          <div class="platform__card platform__card--featured">
            <span class="platform__card-icon platform__card-icon--green">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--secondary-dark)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 3v5h-5"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                <path d="M3 21v-5h5"></path>
              </svg>
            </span>
            <span class="platform__card-copy">
              <span class="platform__card-title">Exercices renouvelés</span>
              <span class="platform__card-text"
                >Chaque session est inédite - la compétence, pas le
                par-cœur.</span
              >
            </span>
          </div>
          <div class="platform__card">
            <span class="platform__card-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--landing-accent)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M9 11H5a2 2 0 0 0-2 2v7"></path>
                <path d="M9 21V7a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14"></path>
                <path d="M21 21V11a2 2 0 0 0-2-2h-4"></path>
              </svg>
            </span>
            <span class="platform__card-copy">
              <span class="platform__card-title">Résultats détaillés</span>
              <span class="platform__card-text"
                >Score par axe, profil radar et recommandations
                priorisées.</span
              >
            </span>
          </div>
          <div class="platform__card">
            <span class="platform__card-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--landing-accent)"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                <polyline points="16 7 22 7 22 13"></polyline>
              </svg>
            </span>
            <span class="platform__card-copy">
              <span class="platform__card-title">Suivi de progression</span>
              <span class="platform__card-text"
                >Courbe d'évolution, badges et série de jours.</span
              >
            </span>
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
    .platform__eyebrow--mobile {
      display: none;
    }
    .platform__title {
      font: 600 36px/1.12 var(--landing-font-display);
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--ink);
    }
    .platform__title--mobile {
      display: none;
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
    .platform__cards {
      display: none;
      flex-direction: column;
      gap: 12px;
    }
    .platform__card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      padding: 20px;
      display: flex;
      align-items: flex-start;
      gap: 14px;
    }
    .platform__card--featured {
      border-top: 3px solid var(--secondary);
    }
    .platform__card-icon {
      width: 42px;
      height: 42px;
      border-radius: 11px;
      background: var(--brand-pastel);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .platform__card-icon--green {
      background: var(--secondary-pastel);
    }
    .platform__card-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .platform__card-title {
      font: 600 15px/22px var(--landing-font-ui);
      color: var(--ink);
    }
    .platform__card-text {
      font: 400 13px/1.5 var(--landing-font-ui);
      color: var(--text-secondary);
    }
    @media (max-width: 767px) {
      .platform {
        background: var(--bg);
      }
      .platform__inner {
        padding: 40px 24px;
      }
      .platform__head {
        gap: 10px;
        margin-bottom: 28px;
      }
      .platform__eyebrow--desktop {
        display: none;
      }
      .platform__eyebrow--mobile {
        display: inline;
      }
      .platform__title--desktop {
        display: none;
      }
      .platform__title--mobile {
        display: block;
        font-size: 27px;
        line-height: 1.14;
      }
      .platform__grid {
        display: none;
      }
      .platform__cards {
        display: flex;
      }
    }
  `,
})
export class LandingPlatform {}
