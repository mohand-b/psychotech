import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-landing-enjeu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="enjeu">
      <div class="enjeu__grid">
        <div class="enjeu__head">
          <span class="enjeu__eyebrow">L'enjeu</span>
          <h2 class="enjeu__title enjeu__title--desktop">
            Les tests psychotechniques sont la première étape éliminatoire.
          </h2>
          <h2 class="enjeu__title enjeu__title--mobile">
            La première étape éliminatoire. On ne s'y improvise pas.
          </h2>
        </div>
        <div class="enjeu__copy">
          <p class="enjeu__text enjeu__text--desktop">
            Dans une sélection professionnelle, l'épreuve psychotechnique
            élimine souvent avant même l'entretien. Un score sous le seuil, un
            axe critique défaillant, et l'opportunité s'éloigne, avec plusieurs
            mois d'attente avant de pouvoir retenter.
          </p>
          <p class="enjeu__text enjeu__text--desktop">
            La plupart des candidats découvrent le format le jour J.
            S'entraîner en conditions réelles transforme l'inconnu en terrain
            familier.
          </p>
          <p class="enjeu__text enjeu__text--mobile">
            Un score sous le seuil, un axe critique défaillant, et
            l'opportunité s'éloigne - souvent plusieurs mois avant de pouvoir
            retenter.
          </p>
          <p class="enjeu__punch">La préparation fait la différence.</p>
          <div class="enjeu__card">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--landing-accent-soft)"
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
            <span class="enjeu__card-title">Une seule tentative, des mois en jeu</span>
            <span class="enjeu__card-text"
              >S'entraîner en conditions réelles transforme l'inconnu en
              terrain familier.</span
            >
          </div>
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
      padding: 112px 32px;
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
    .enjeu__title--mobile {
      display: none;
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
    .enjeu__text--mobile {
      display: none;
    }
    .enjeu__punch {
      font: 600 20px/1.4 var(--landing-font-display);
      letter-spacing: -0.01em;
      color: var(--landing-text);
      margin: 0;
    }
    .enjeu__card {
      display: none;
      background: rgba(124, 92, 252, 0.08);
      border: 1px solid rgba(124, 92, 252, 0.22);
      border-radius: 16px;
      padding: 24px;
      flex-direction: column;
      gap: 12px;
    }
    .enjeu__card-title {
      font: 600 21px/1.2 var(--landing-font-display);
      color: var(--landing-text);
    }
    .enjeu__card-text {
      font: 400 14px/1.6 var(--landing-font-ui);
      color: rgba(255, 255, 255, 0.55);
    }
    @media (max-width: 767px) {
      .enjeu__grid {
        padding: 56px 24px;
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .enjeu__head {
        gap: 20px;
      }
      .enjeu__title--desktop {
        display: none;
      }
      .enjeu__title--mobile {
        display: block;
        font-size: 27px;
        line-height: 1.14;
        letter-spacing: -0.02em;
      }
      .enjeu__copy {
        border-left: none;
        padding-left: 0;
        gap: 20px;
      }
      .enjeu__text--desktop {
        display: none;
      }
      .enjeu__text--mobile {
        display: block;
        font-size: 15px;
        line-height: 1.65;
      }
      .enjeu__punch {
        font: 600 15px/1.6 var(--landing-font-ui);
      }
      .enjeu__card {
        display: flex;
      }
    }
  `,
})
export class LandingEnjeu {}
