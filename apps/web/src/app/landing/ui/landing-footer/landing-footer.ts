import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  SITE_COPYRIGHT_YEAR,
  SITE_NAME,
  SITE_TAGLINE,
} from '../../../core/seo/route-seo';
import { LEGAL_DOCUMENTS } from '../../../legal/data/legal-documents';

@Component({
  selector: 'app-landing-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
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
        <div class="footer__col">
          <span class="footer__col-title">Produit</span>
          <a class="footer__link" href="#axes">Les axes</a>
          <a class="footer__link" href="#fonctionnement">Fonctionnement</a>
          <a class="footer__link" href="#faq">FAQ</a>
        </div>
        <div class="footer__col">
          <span class="footer__col-title">Légal</span>
          @for (entry of legalLinks; track entry.path) {
            <a class="footer__link" [routerLink]="entry.path">{{
              entry.tabLabel
            }}</a>
          }
        </div>
      </div>
      <div class="footer__bottom">
        <div class="footer__bottom-inner">
          <span class="footer__mention"
            >© {{ copyrightYear }}
            <a class="footer__mention-link" routerLink="/">{{ siteName }}</a>
            — {{ tagline }}</span
          >
          <span class="footer__mention"
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
    .footer__mention-link {
      color: inherit;
      text-decoration: none;
    }
    .footer__mention-link:hover {
      color: var(--landing-text);
    }
    @media (max-width: 767px) {
      .footer__grid {
        padding: 40px 20px 28px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 28px 24px;
      }
      .footer__brand {
        grid-column: 1 / -1;
        gap: 10px;
      }
      .footer__logo {
        font-size: 18px;
      }
      .footer__baseline {
        max-width: none;
      }
      .footer__col {
        gap: 10px;
      }
      .footer__link {
        font-size: 13.5px;
        padding: 3px 0;
      }
      .footer__bottom-inner {
        padding: 18px 20px calc(28px + env(safe-area-inset-bottom));
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
      }
      .footer__mention {
        font-size: 12px;
      }
    }
  `,
})
export class LandingFooter {
  protected readonly legalLinks = LEGAL_DOCUMENTS;
  protected readonly siteName = SITE_NAME;
  protected readonly tagline = SITE_TAGLINE;
  protected readonly copyrightYear = SITE_COPYRIGHT_YEAR;
}
