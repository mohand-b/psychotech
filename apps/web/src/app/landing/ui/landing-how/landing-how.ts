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
        <div class="how__stack">
          <div class="how__item">
            <span class="how__badge t-mono">1</span>
            <span class="how__item-copy">
              <span class="how__item-title">Choisissez votre mode</span>
              <span class="how__item-text"
                >Simulation complète de tous les axes, ou entraînement ciblé
                sur un seul.</span
              >
            </span>
          </div>
          <div class="how__item">
            <span class="how__badge t-mono">2</span>
            <span class="how__item-copy">
              <span class="how__item-title">Passez l'épreuve</span>
              <span class="how__item-text"
                >En conditions réelles : minuté, chronométré, sans seconde
                chance.</span
              >
            </span>
          </div>
          <div class="how__item">
            <span class="how__badge t-mono">3</span>
            <span class="how__item-copy">
              <span class="how__item-title">Analysez et progressez</span>
              <span class="how__item-text"
                >Score par axe, recommandations et suivi de progression.</span
              >
            </span>
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
    .how__stack {
      display: none;
      flex-direction: column;
      gap: 18px;
    }
    .how__item {
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .how__badge {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: var(--card);
      border: 1px solid var(--border);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      color: var(--landing-accent);
      flex-shrink: 0;
    }
    .how__item-copy {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding-top: 6px;
    }
    .how__item-title {
      font: 600 16px/22px var(--landing-font-ui);
      color: var(--ink);
    }
    .how__item-text {
      font: 400 14px/1.55 var(--landing-font-ui);
      color: var(--text-secondary);
    }
    @media (max-width: 767px) {
      .how {
        background: var(--bg);
        border-top: none;
      }
      .how__inner {
        padding: 40px 24px;
      }
      .how__head {
        gap: 10px;
        margin-bottom: 28px;
      }
      .how__title {
        font-size: 27px;
        line-height: 1.14;
      }
      .how__steps {
        display: none;
      }
      .how__stack {
        display: flex;
      }
    }
  `,
})
export class LandingHow {}
