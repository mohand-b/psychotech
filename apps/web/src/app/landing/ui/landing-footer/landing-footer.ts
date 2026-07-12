import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-landing-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="footer">
      <div class="footer__grid">
        <div class="footer__brand">
          <span class="footer__logo"
            >Psycho<span class="footer__logo-accent">Tech</span></span
          >
          <span class="footer__baseline"
            >L'entraînement aux tests psychotechniques des sélections
            professionnelles.</span
          >
        </div>
        <div class="footer__col footer__col--product">
          <span class="footer__col-title">Produit</span>
          <a class="footer__link" href="#axes">Les axes</a>
          <a class="footer__link" href="#fonctionnement">Fonctionnement</a>
          <a class="footer__link" href="#faq">FAQ</a>
        </div>
        <div class="footer__col">
          <span class="footer__col-title footer__col-title--desktop">Légal</span>
          <a class="footer__link">Mentions légales</a>
          <a class="footer__link">Confidentialité</a>
          <a class="footer__link">CGV</a>
        </div>
      </div>
      <div class="footer__bottom">
        <div class="footer__bottom-inner">
          <span class="footer__mention">© 2026 PsychoTech. Tous droits réservés.</span>
          <span class="footer__mention footer__mention--desktop"
            >Conçu pour les candidats aux sélections professionnelles.</span
          >
        </div>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      background: var(--landing-bg);
      border-top: 1px solid var(--landing-border-soft);
    }
    .footer__grid {
      max-width: 1232px;
      margin: 0 auto;
      padding: 40px 32px 28px;
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr;
      gap: 32px;
    }
    .footer__brand {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .footer__logo {
      font: 700 22px/1 var(--font-display);
      color: var(--landing-text);
    }
    .footer__logo-accent {
      color: var(--landing-accent-soft);
    }
    .footer__baseline {
      font: 400 13px/1.6 var(--landing-font-ui);
      color: var(--landing-text-muted);
      max-width: 260px;
    }
    .footer__col {
      display: flex;
      flex-direction: column;
      gap: 11px;
    }
    .footer__col-title {
      font: 600 11px/14px var(--landing-font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: rgba(255, 255, 255, 0.35);
    }
    .footer__link {
      font: 400 14px/20px var(--landing-font-ui);
      color: rgba(255, 255, 255, 0.65);
      text-decoration: none;
      cursor: pointer;
    }
    .footer__link:hover {
      color: var(--landing-text);
    }
    .footer__bottom {
      border-top: 1px solid var(--landing-border-soft);
    }
    .footer__bottom-inner {
      max-width: 1232px;
      margin: 0 auto;
      padding: 20px 32px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .footer__mention {
      font: 400 13px/18px var(--landing-font-ui);
      color: rgba(255, 255, 255, 0.35);
    }
    @media (max-width: 767px) {
      .footer__grid {
        padding: 28px 24px 24px;
        display: flex;
        flex-direction: column;
        gap: 24px;
      }
      .footer__logo {
        font-size: 19px;
      }
      .footer__baseline {
        max-width: none;
      }
      .footer__col {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 16px;
      }
      .footer__col--product {
        display: none;
      }
      .footer__col-title--desktop {
        display: none;
      }
      .footer__link {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.6);
      }
      .footer__bottom {
        border-top: none;
      }
      .footer__bottom-inner {
        padding: 0 24px 28px;
      }
      .footer__mention {
        font-size: 12px;
        border-top: 1px solid var(--landing-border-soft);
        padding-top: 18px;
        flex: 1;
      }
      .footer__mention--desktop {
        display: none;
      }
    }
  `,
})
export class LandingFooter {}
