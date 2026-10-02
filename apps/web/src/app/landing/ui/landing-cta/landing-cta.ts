import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { LANDING_ROUTE, LandingAction } from '../../util/landing-link';
import { LandingButton } from '../landing-button/landing-button';
import { LandingReveal } from '../landing-reveal.directive';

const SIGNUP_ACTION: LandingAction = {
  label: 'Créer un compte',
  link: { route: LANDING_ROUTE.register },
};

const RESUME_ACTION: LandingAction = {
  label: "Reprendre l'entraînement",
  link: { route: LANDING_ROUTE.trainings },
};

@Component({
  selector: 'app-landing-cta',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingButton, LandingReveal],
  template: `
    <section class="cta">
      <span class="cta__glow" aria-hidden="true"></span>
      <div class="cta__content" appLandingReveal>
        <h2 class="cta__title">Arrivez prêt le jour de la sélection</h2>
        <div class="cta__pitch">
          @if (authenticated()) {
            <p class="cta__text">
              Votre compte est prêt. Chaque session génère de nouveaux exercices
              : reprenez l'entraînement dès maintenant.
            </p>
          } @else {
            <p class="cta__text">
              Essayez chaque épreuve en mode découverte, travaillez vos points
              faibles et suivez votre progression jusqu'au jour J.
            </p>
          }
          <app-landing-button
            size="cta"
            [link]="action().link"
            [arrow]="true"
            >{{ action().label }}</app-landing-button
          >
        </div>
      </div>
    </section>
  `,
  styles: `
    .cta {
      position: relative;
      overflow: hidden;
      border-top: 1px solid var(--landing-rule);
    }
    .cta__glow {
      position: absolute;
      top: 50%;
      left: 50%;
      width: 700px;
      height: 460px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      background: radial-gradient(
        ellipse at center,
        var(--landing-glow) 0%,
        var(--landing-glow-edge) 68%
      );
    }
    .cta__content {
      position: relative;
      z-index: 1;
      max-width: var(--landing-container-width);
      margin: 0 auto;
      padding: var(--landing-section-space) var(--landing-gutter);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 22px;
      text-align: center;
    }
    .cta__title {
      max-width: 640px;
      font: 600 44px/1.08 var(--landing-font-display);
      letter-spacing: -0.025em;
      color: var(--landing-text);
      text-wrap: balance;
    }
    .cta__pitch {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 22px;
    }
    .cta__text {
      max-width: 460px;
      font: 400 16px/1.55 var(--landing-font-ui);
      color: var(--landing-text-body);
    }
    @media (max-width: 1023px) {
      .cta__glow {
        width: 480px;
        height: 320px;
      }
      .cta__content {
        gap: 16px;
      }
      .cta__title {
        font-size: 30px;
        line-height: 1.1;
      }
      .cta__pitch {
        align-self: stretch;
      }
      .cta__text {
        font-size: 14.5px;
      }
    }
  `,
})
export class LandingCta {
  readonly authenticated = input(false);

  protected readonly action = computed(() =>
    this.authenticated() ? RESUME_ACTION : SIGNUP_ACTION,
  );
}
