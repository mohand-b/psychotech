import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LANDING_SECTION } from '../../util/landing-sections';
import { LandingReveal } from '../landing-reveal';

@Component({
  selector: 'app-landing-enterprise',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal],
  template: `
    <section class="enterprise" [id]="sectionId">
      <div class="enterprise__grid" appLandingReveal>
        <div class="enterprise__head">
          <span class="enterprise__eyebrow"
            >Employeurs et centres de formation</span
          >
          <h2 class="enterprise__title">Vous préparez des candidats ?</h2>
        </div>
        <div class="enterprise__copy">
          <p class="enterprise__text">
            Invitez votre cohorte, offrez-lui un accès illimité pendant toute la
            préparation et suivez sa progression, candidat par candidat, depuis
            un tableau de bord dédié.
          </p>
          <p class="enterprise__soon">
            <span class="enterprise__soon-label"
              >Découvrir l'offre entreprise</span
            >
            <span class="enterprise__soon-badge">Prochainement</span>
          </p>
        </div>
      </div>
    </section>
  `,
  styles: `
    .enterprise {
      border-top: 1px solid var(--landing-rule);
      scroll-margin-top: var(--landing-header-height);
    }
    .enterprise__grid {
      max-width: var(--landing-container-width);
      margin: 0 auto;
      padding: var(--landing-section-space) var(--landing-gutter);
      display: grid;
      grid-template-columns: 1fr 1.6fr;
      align-items: start;
      gap: 64px;
    }
    .enterprise__head {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .enterprise__eyebrow {
      font: 600 11px / normal var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--landing-accent-soft);
    }
    .enterprise__title {
      font: 600 40px/1.1 var(--landing-font-display);
      letter-spacing: -0.02em;
      color: var(--landing-text);
    }
    .enterprise__copy {
      display: flex;
      flex-direction: column;
      gap: 22px;
      padding-left: 44px;
      border-left: 1px solid var(--landing-rule-strong);
    }
    .enterprise__text {
      font: 400 17px/1.65 var(--landing-font-ui);
      color: var(--landing-text-body);
    }
    .enterprise__soon {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .enterprise__soon-label {
      font: 600 15px / normal var(--landing-font-ui);
      color: var(--landing-text-muted);
    }
    .enterprise__soon-badge {
      display: inline-flex;
      align-items: center;
      padding: 5px 11px;
      border: 1px solid var(--landing-border);
      border-radius: var(--radius-badge);
      background: var(--landing-surface-raised);
      font: 600 11px/1 var(--landing-font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--landing-text-body);
    }
    @media (max-width: 1023px) {
      .enterprise__grid {
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .enterprise__head {
        gap: 10px;
      }
      .enterprise__title {
        font-size: 28px;
        line-height: 1.12;
      }
      .enterprise__copy {
        gap: 16px;
        padding-left: 18px;
      }
      .enterprise__text {
        font-size: 15px;
        line-height: 1.6;
      }
      .enterprise__soon {
        flex-wrap: wrap;
        row-gap: 10px;
      }
      .enterprise__soon-label {
        font-size: 14.5px;
        white-space: nowrap;
      }
    }
  `,
})
export class LandingEnterprise {
  protected readonly sectionId = LANDING_SECTION.enterprise;
}
