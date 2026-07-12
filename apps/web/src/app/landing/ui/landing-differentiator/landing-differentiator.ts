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
          <span class="diff__badge">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--secondary)"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
            <span>Le différenciateur</span>
          </span>
          <h2 class="diff__title">Des exercices renouvelés à chaque session</h2>
          <p class="diff__text diff__text--desktop">
            Impossible d'apprendre les réponses par cœur&nbsp;: chaque session
            est inédite. Vous entraînez la compétence réelle évaluée le jour de
            l'examen, et votre score mesure votre vraie performance.
          </p>
          <p class="diff__text diff__text--mobile">
            Impossible d'apprendre par cœur : chaque session est inédite. Votre
            score mesure votre vraie performance.
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
              <span class="diff__point-label--desktop"
                >Aucune session identique à la précédente</span
              >
              <span class="diff__point-label--mobile"
                >Aucune session identique</span
              >
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
              <span class="diff__point-label--desktop"
                >Un niveau calibré sur les barèmes du secteur</span
              >
              <span class="diff__point-label--mobile"
                >Niveau calibré sur le secteur</span
              >
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
              <span class="diff__point-label--desktop"
                >Un score fidèle à votre niveau réel</span
              >
              <span class="diff__point-label--mobile"
                >Score fidèle à votre niveau réel</span
              >
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
      padding: 112px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      text-align: center;
    }
    .diff__badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(95, 206, 90, 0.35);
      border-radius: 999px;
      padding: 6px 13px;
      font: 600 12px/16px var(--landing-font-ui);
      color: var(--secondary);
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
    .diff__text--mobile {
      display: none;
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
    .diff__point-label--mobile {
      display: none;
    }
    @media (max-width: 767px) {
      .diff {
        background: var(--bg);
        overflow: visible;
        padding: 0 16px 56px;
      }
      .diff__panel {
        background: var(--landing-bg);
        border-radius: 20px;
        overflow: hidden;
      }
      .diff__glow {
        top: -10%;
        left: auto;
        right: -10%;
        width: 280px;
        height: 280px;
        transform: none;
        background: radial-gradient(
          circle,
          rgba(95, 206, 90, 0.16) 0%,
          rgba(95, 206, 90, 0) 65%
        );
      }
      .diff__content {
        padding: 36px 26px;
        align-items: flex-start;
        gap: 20px;
        text-align: left;
      }
      .diff__title {
        font-size: 28px;
        line-height: 1.1;
        letter-spacing: -0.02em;
      }
      .diff__text--desktop {
        display: none;
      }
      .diff__text--mobile {
        display: block;
        font-size: 15px;
        line-height: 1.6;
      }
      .diff__points {
        flex-direction: column;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 10px;
        margin-top: 0;
      }
      .diff__point {
        gap: 11px;
        font-size: 14px;
      }
      .diff__point-label--desktop {
        display: none;
      }
      .diff__point-label--mobile {
        display: inline;
      }
    }
  `,
})
export class LandingDifferentiator {}
