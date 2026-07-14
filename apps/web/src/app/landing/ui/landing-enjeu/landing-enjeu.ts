import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LandingReveal } from '../landing-reveal.directive';

@Component({
  selector: 'app-landing-enjeu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal],
  template: `
    <section class="enjeu">
      <div class="enjeu__grid">
        <div class="enjeu__head" appLandingReveal>
          <span class="enjeu__eyebrow">L'enjeu</span>
          <h2 class="enjeu__title">
            Les tests psychotechniques sont la première étape éliminatoire.
          </h2>
        </div>
        <div class="enjeu__copy" appLandingReveal="0.12s">
          <p class="enjeu__text">
            Dans une sélection professionnelle, l'épreuve psychotechnique
            élimine souvent avant même l'entretien. Un score sous le seuil, un
            axe critique défaillant, et l'opportunité s'éloigne, avec plusieurs
            mois d'attente avant de pouvoir retenter.
          </p>
          <p class="enjeu__text">
            La plupart des candidats découvrent le format le jour J.
            S'entraîner en conditions réelles transforme l'inconnu en terrain
            familier.
          </p>
          <p class="enjeu__punch">La préparation fait la différence.</p>
        </div>
      </div>
    </section>
  `,
  styles: `
    .enjeu {
      background: var(--landing-bg);
      border-top: 1px solid var(--landing-border-soft);
    }
    .enjeu__grid {
      max-width: 1100px;
      margin: 0 auto;
      padding: 72px 32px;
      display: grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap: 72px;
    }
    .enjeu__head {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    .enjeu__eyebrow {
      font: 600 11px/14px var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--landing-accent-soft);
    }
    .enjeu__title {
      font: 600 40px/1.1 var(--landing-font-display);
      letter-spacing: -0.025em;
      margin: 0;
      color: var(--landing-text);
    }
    .enjeu__copy {
      display: flex;
      flex-direction: column;
      gap: 18px;
      border-left: 1px solid rgba(255, 255, 255, 0.1);
      padding-left: 44px;
      justify-content: center;
    }
    .enjeu__text {
      font: 400 16px/1.7 var(--landing-font-ui);
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
    }
    .enjeu__punch {
      font: 600 20px/1.4 var(--landing-font-display);
      letter-spacing: -0.01em;
      color: var(--landing-text);
      margin: 0;
    }
    @media (max-width: 767px) {
      .enjeu__grid {
        padding: 64px 20px;
        display: flex;
        flex-direction: column;
        gap: 22px;
      }
      .enjeu__head {
        gap: 14px;
      }
      .enjeu__title {
        font-size: 27px;
        line-height: 1.15;
        letter-spacing: -0.02em;
      }
      .enjeu__copy {
        gap: 14px;
        padding-left: 18px;
      }
      .enjeu__text {
        font-size: 14.5px;
        line-height: 1.65;
      }
      .enjeu__punch {
        font: 600 17px/1.4 var(--landing-font-display);
      }
    }
  `,
})
export class LandingEnjeu {}
