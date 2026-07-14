import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LandingReveal } from '../landing-reveal.directive';

@Component({
  selector: 'app-landing-how',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal],
  template: `
    <section class="how" id="fonctionnement">
      <div class="how__inner">
        <div class="how__head" appLandingReveal>
          <span class="how__eyebrow">Comment ça marche</span>
          <h2 class="how__title">Trois étapes, des résultats exploitables</h2>
        </div>
        <div class="how__steps">
          <div class="how__step how__step--first" appLandingReveal>
            <span class="how__num how__num--active t-mono">01</span>
            <span class="how__step-title">Choisissez votre séance</span>
            <span class="how__step-text"
              >Une simulation complète de l'épreuve de votre secteur, ou un
              entraînement ciblé sur l'axe de votre choix.</span
            >
          </div>
          <div class="how__step" appLandingReveal="0.1s">
            <span class="how__num t-mono">02</span>
            <span class="how__step-title"
              >Passez l'épreuve en conditions réelles</span
            >
            <span class="how__step-text"
              >Chronométré, minuté, sans seconde chance&nbsp;: le format exact
              de la sélection, jusqu'à la pression du temps.</span
            >
          </div>
          <div class="how__step" appLandingReveal="0.1s">
            <span class="how__num t-mono">03</span>
            <span class="how__step-title">Analysez, corrigez, progressez</span>
            <span class="how__step-text"
              >Score détaillé, correction de vos réponses, recommandations
              priorisées et suivi de votre progression.</span
            >
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .how {
      background: var(--card);
      border-top: 1px solid var(--border);
      scroll-margin-top: calc(64px + env(safe-area-inset-top));
    }
    .how__inner {
      max-width: 1160px;
      margin: 0 auto;
      padding: 64px 32px 72px;
    }
    .how__head {
      display: flex;
      flex-direction: column;
      gap: 16px;
      margin-bottom: 44px;
      max-width: 560px;
    }
    .how__eyebrow {
      font: 600 11px/14px var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--label);
    }
    .how__title {
      font: 600 36px/1.12 var(--landing-font-display);
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--ink);
    }
    .how__steps {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 48px;
    }
    .how__step {
      display: flex;
      flex-direction: column;
      gap: 14px;
      border-top: 2px solid var(--border);
      padding-top: 26px;
    }
    .how__step--first {
      border-top-color: var(--landing-accent);
    }
    .how__num {
      font-size: 13px;
      font-weight: 600;
      color: var(--label);
    }
    .how__num--active {
      color: var(--landing-accent);
    }
    .how__step-title {
      font: 600 21px/28px var(--landing-font-display);
      letter-spacing: -0.01em;
      color: var(--ink);
    }
    .how__step-text {
      font: 400 14.5px/1.65 var(--landing-font-ui);
      color: var(--text-secondary);
    }
    @media (max-width: 767px) {
      .how__inner {
        padding: 56px 20px 60px;
      }
      .how__head {
        gap: 12px;
        margin-bottom: 32px;
      }
      .how__title {
        font-size: 26px;
        line-height: 1.15;
      }
      .how__steps {
        grid-template-columns: 1fr;
        gap: 26px;
      }
      .how__step {
        gap: 10px;
        padding-top: 18px;
      }
      .how__num {
        font-size: 12.5px;
      }
      .how__step-title {
        font-size: 18px;
        line-height: 24px;
      }
      .how__step-text {
        font-size: 13.5px;
        line-height: 1.6;
      }
    }
  `,
})
export class LandingHow {}
