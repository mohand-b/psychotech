import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

type BillingPeriod = 'monthly' | 'annual';

@Component({
  selector: 'app-landing-pricing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="pricing" id="tarifs">
      <div class="pricing__head">
        <span class="pricing__eyebrow">Tarifs</span>
        <h2 class="pricing__title">Choisissez votre rythme</h2>
        <div class="pricing__toggle">
          <button
            type="button"
            class="pricing__period"
            [class.pricing__period--active]="billing() === 'monthly'"
            (click)="billing.set('monthly')"
          >
            Mensuel
          </button>
          <button
            type="button"
            class="pricing__period"
            [class.pricing__period--active]="billing() === 'annual'"
            (click)="billing.set('annual')"
          >
            Annuel
            <span
              class="pricing__discount t-mono"
              [class.pricing__discount--active]="billing() === 'annual'"
              >−20 %</span
            >
          </button>
        </div>
      </div>
      <div class="pricing__cards">
        <section class="pricing__card pricing__card--featured">
          <span class="pricing__flag">Recommandé</span>
          <div class="pricing__card-head">
            <span class="pricing__plan pricing__plan--brand">Illimité</span>
            <span class="pricing__price-row">
              <span class="pricing__price">{{ unlimitedPrice() }}</span>
              <span class="pricing__per">/mois</span>
            </span>
          </div>
          <div class="pricing__features">
            <span class="pricing__feature">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--landing-accent)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span class="pricing__feature-strong">Énergie illimitée</span>
            </span>
            <span class="pricing__feature">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--landing-accent)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Résultats détaillés, progression, série
            </span>
          </div>
          <a class="pricing__cta pricing__cta--brand" routerLink="/register"
            >Passer à l'Illimité</a
          >
        </section>
        <section class="pricing__card">
          <div class="pricing__card-head">
            <span class="pricing__plan">Essentiel</span>
            <span class="pricing__price-row">
              <span class="pricing__price">{{ essentialPrice() }}</span>
              <span class="pricing__per">/mois</span>
            </span>
          </div>
          <div class="pricing__features">
            <span class="pricing__feature">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--success)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span class="pricing__feature-strong">5 énergies par jour</span>
            </span>
            <span class="pricing__feature">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--success)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Résultats détaillés, série et badges
            </span>
          </div>
          <a class="pricing__cta" routerLink="/register">Choisir Essentiel</a>
        </section>
        <section class="pricing__card">
          <div class="pricing__card-head">
            <span class="pricing__plan">Découverte</span>
            <span class="pricing__price">Gratuit</span>
          </div>
          <div class="pricing__features">
            <span class="pricing__feature">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--success)"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Tutoriels des 5 axes, score indicatif
            </span>
          </div>
          <a class="pricing__cta" routerLink="/register">Commencer</a>
        </section>
      </div>
    </section>
  `,
  styles: `
    .pricing {
      background: var(--card);
      border-top: 1px solid var(--border);
      padding: 56px 24px;
      scroll-margin-top: calc(64px + env(safe-area-inset-top));
    }
    .pricing__head {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      text-align: center;
      margin-bottom: 28px;
    }
    .pricing__eyebrow {
      font: 600 11px/14px var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--label);
    }
    .pricing__title {
      font: 600 27px/1.14 var(--landing-font-display);
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--ink);
    }
    .pricing__toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: var(--radius-button);
      padding: 4px;
    }
    .pricing__period {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      color: var(--text-secondary);
      font: 600 13px/18px var(--landing-font-ui);
      border: none;
      padding: 9px 18px;
      border-radius: 7px;
      cursor: pointer;
      min-height: 40px;
    }
    .pricing__period--active {
      background: var(--ink);
      color: #ffffff;
    }
    .pricing__discount {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary);
    }
    .pricing__discount--active {
      color: var(--secondary-dark);
    }
    .pricing__cards {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .pricing__card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-panel);
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .pricing__card--featured {
      border: 2px solid var(--landing-accent);
      padding: 22px;
      box-shadow: var(--shadow-raised);
      position: relative;
      margin-top: 11px;
    }
    .pricing__flag {
      position: absolute;
      top: -12px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--landing-accent);
      color: #ffffff;
      font: 600 11px/16px var(--landing-font-ui);
      letter-spacing: 0.04em;
      padding: 4px 12px;
      border-radius: var(--radius-badge);
      white-space: nowrap;
    }
    .pricing__card-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }
    .pricing__plan {
      font: 600 11px/14px var(--landing-font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--label);
    }
    .pricing__plan--brand {
      color: var(--landing-accent);
    }
    .pricing__price-row {
      display: flex;
      align-items: baseline;
      gap: 5px;
    }
    .pricing__price {
      font: 600 28px/34px var(--landing-font-display);
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    .pricing__per {
      font: 400 13px/18px var(--landing-font-ui);
      color: var(--label);
    }
    .pricing__features {
      display: flex;
      flex-direction: column;
      gap: 9px;
      border-top: 1px solid var(--border);
      padding-top: 14px;
    }
    .pricing__feature {
      display: flex;
      align-items: flex-start;
      gap: 9px;
      font: 400 13px/1.45 var(--landing-font-ui);
      color: var(--ink);
    }
    .pricing__feature svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
    .pricing__feature-strong {
      font-weight: 600;
    }
    .pricing__cta {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 48px;
      background: var(--card);
      color: var(--ink);
      font: 600 15px/20px var(--landing-font-ui);
      text-decoration: none;
      border: 1px solid var(--border);
      border-radius: var(--radius-button);
    }
    .pricing__cta--brand {
      background: var(--landing-accent);
      color: #ffffff;
      border: none;
    }
    @media (min-width: 768px) {
      .pricing {
        display: none;
      }
    }
  `,
})
export class LandingPricing {
  protected readonly billing = signal<BillingPeriod>('monthly');

  protected readonly essentialPrice = computed(() =>
    this.billing() === 'annual' ? '7,99 €' : '9,99 €',
  );
  protected readonly unlimitedPrice = computed(() =>
    this.billing() === 'annual' ? '15,99 €' : '19,99 €',
  );
}
