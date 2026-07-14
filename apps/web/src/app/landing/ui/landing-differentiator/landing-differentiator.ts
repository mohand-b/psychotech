import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LandingReveal } from '../landing-reveal.directive';

@Component({
  selector: 'app-landing-differentiator',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal],
  template: `
    <section class="diff">
      <div class="diff__panel">
        <div class="diff__glow" aria-hidden="true"></div>
        <div class="diff__content" appLandingReveal>
          <h2 class="diff__title">Des exercices renouvelés à chaque session</h2>
          <p class="diff__text">
            Impossible d'apprendre les réponses par cœur&nbsp;: chaque session
            est inédite. Vous entraînez la compétence réelle évaluée le jour de
            l'examen, et votre score mesure votre vraie performance.
          </p>
          <div class="diff__points">
            <span class="diff__point">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--secondary)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Aucune session identique à la précédente
            </span>
            <span class="diff__point">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--secondary)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Un niveau calibré sur les barèmes du secteur
            </span>
            <span class="diff__point">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--secondary)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Un score fidèle à votre niveau réel
            </span>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: `
    .diff {
      position: relative;
      background: var(--landing-bg);
      overflow: hidden;
    }
    .diff__panel {
      position: relative;
    }
    .diff__glow {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 640px;
      height: 460px;
      transform: translate(-50%, -50%);
      background: radial-gradient(
        circle,
        rgba(95, 206, 90, 0.13) 0%,
        rgba(95, 206, 90, 0) 65%
      );
      pointer-events: none;
    }
    .diff__content {
      position: relative;
      z-index: 1;
      max-width: 860px;
      margin: 0 auto;
      padding: 72px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      text-align: center;
    }
    .diff__title {
      font: 600 46px/1.08 var(--landing-font-display);
      letter-spacing: -0.025em;
      margin: 0;
      color: var(--landing-text);
      max-width: 700px;
    }
    .diff__text {
      font: 400 17px/1.65 var(--landing-font-ui);
      color: rgba(255, 255, 255, 0.6);
      margin: 0;
      max-width: 560px;
    }
    .diff__points {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px 32px;
      margin-top: 10px;
    }
    .diff__point {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      font: 400 15px/22px var(--landing-font-ui);
      color: rgba(255, 255, 255, 0.88);
    }
    .diff__point svg {
      flex-shrink: 0;
    }
    @media (max-width: 767px) {
      .diff__glow {
        width: 480px;
        height: 380px;
      }
      .diff__content {
        padding: 64px 20px;
        gap: 18px;
      }
      .diff__title {
        font-size: 29px;
        line-height: 1.12;
        letter-spacing: -0.02em;
      }
      .diff__text {
        font-size: 14.5px;
        line-height: 1.65;
      }
      .diff__points {
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 10px;
        text-align: left;
      }
      .diff__point {
        font-size: 13.5px;
        line-height: 1.45;
        align-items: flex-start;
      }
    }
  `,
})
export class LandingDifferentiator {}
