import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LandingReveal } from '../landing-reveal.directive';

@Component({
  selector: 'app-landing-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal, RouterLink],
  template: `
    <section class="cta">
      <div class="cta__glow" aria-hidden="true"></div>
      <div class="cta__content" appLandingReveal>
        <h2 class="cta__title">
          Prêt à mettre toutes les chances de votre côté&nbsp;?
        </h2>
        <p class="cta__text cta__text--desktop">
          Créez votre compte gratuitement et découvrez chaque épreuve en
          tutoriel. Aucune carte bancaire requise.
        </p>
        <p class="cta__text cta__text--mobile">
          Commencez gratuitement avec les tutoriels des 5 axes.
        </p>
        <a class="cta__button" routerLink="/register">
          Créer un compte
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12h14"></path>
            <path d="m12 5 7 7-7 7"></path>
          </svg>
        </a>
      </div>
    </section>
  `,
  styles: `
    .cta {
      position: relative;
      background: var(--landing-bg);
      overflow: hidden;
    }
    .cta__glow {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 700px;
      height: 500px;
      transform: translate(-50%, -50%);
      background: radial-gradient(
        circle,
        rgba(124, 92, 252, 0.22) 0%,
        rgba(124, 92, 252, 0) 68%
      );
      pointer-events: none;
    }
    .cta__content {
      position: relative;
      z-index: 1;
      max-width: 1232px;
      margin: 0 auto;
      padding: 72px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      text-align: center;
    }
    .cta__title {
      font: 600 44px/1.08 var(--landing-font-display);
      letter-spacing: -0.025em;
      margin: 0;
      color: var(--landing-text);
      max-width: 680px;
    }
    .cta__text {
      font: 400 16px/1.55 var(--landing-font-ui);
      color: rgba(255, 255, 255, 0.62);
      margin: 0;
      max-width: 480px;
    }
    .cta__text--mobile {
      display: none;
    }
    .cta__button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--landing-accent);
      color: #ffffff;
      font: 600 16px/22px var(--landing-font-ui);
      text-decoration: none;
      padding: 16px 28px;
      border-radius: 12px;
    }
    .cta__button:hover {
      background: var(--landing-accent-hover);
    }
    @media (max-width: 767px) {
      .cta__glow {
        width: 440px;
        height: 340px;
      }
      .cta__content {
        padding: 48px 24px;
        gap: 20px;
      }
      .cta__title {
        font-size: 28px;
        line-height: 1.1;
        letter-spacing: -0.02em;
      }
      .cta__text--desktop {
        display: none;
      }
      .cta__text--mobile {
        display: block;
        font-size: 15px;
      }
      .cta__button {
        justify-content: center;
        width: 100%;
      }
    }
  `,
})
export class LandingCta {}
