import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SITE_COPYRIGHT_YEAR, SITE_NAME } from '../../../core/seo/route-seo';
import { LEGAL_DOCUMENTS } from '../../../legal/data/legal-documents';
import { NOUVEAUTES_ROUTE } from '../../../shared/util/changelog-link';
import {
  CONTACT_ROUTE,
  contactQueryParams,
} from '../../../shared/util/contact-link';
import { LANDING_ROUTE } from '../../util/landing-link';
import {
  LANDING_SECTION,
  LandingSectionId,
  landingAnchorHref,
} from '../../util/landing-sections';

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
        <nav class="footer__col" aria-label="Produit">
          <span class="footer__col-title">Produit</span>
          <a class="footer__link" [href]="anchor(section.story)"
            >Fonctionnement</a
          >
          <a class="footer__link" [href]="anchor(section.axes)">Les axes</a>
          <a class="footer__link" [routerLink]="route.pricing">Tarifs</a>
          <a class="footer__link" [href]="anchor(section.enterprise)"
            >Offre entreprise</a
          >
        </nav>
        <nav class="footer__col" aria-label="Aide">
          <span class="footer__col-title">Aide</span>
          <a class="footer__link" [routerLink]="route.guide"
            >Guide des épreuves</a
          >
          <a class="footer__link" [routerLink]="nouveautesRoute">Nouveautés</a>
          <a class="footer__link" [routerLink]="contactRoute">Contact</a>
          <a
            class="footer__link"
            [routerLink]="contactRoute"
            [queryParams]="problemParams"
            >Signaler un problème</a
          >
        </nav>
        <nav class="footer__col footer__col--legal" aria-label="Légal">
          <span class="footer__col-title">Légal</span>
          <div class="footer__legal-links">
            @for (entry of legalLinks; track entry.path) {
              <a class="footer__link" [routerLink]="entry.path"
                ><span class="footer__label-full">{{ entry.title }}</span
                ><span class="footer__label-short">{{
                  entry.tabLabel
                }}</span></a
              >
            }
          </div>
        </nav>
      </div>
      <div class="footer__bottom">
        <div class="footer__bottom-inner">
          <span class="footer__mention"
            >© {{ copyrightYear }}
            <a class="footer__mention-link" routerLink="/">{{ siteName }}</a>
            · L'entraînement aux tests psychotechniques</span
          >
          <span class="footer__mention footer__mention--secondary"
            >Conçu pour les candidats aux sélections professionnelles.</span
          >
        </div>
      </div>
    </footer>
  `,
  styles: `
    .footer {
      border-top: 1px solid var(--landing-rule);
      background: var(--landing-bg-deep);
    }
    .footer__grid {
      max-width: var(--landing-container-width);
      margin: 0 auto;
      padding: 40px var(--landing-gutter) 28px;
      display: grid;
      grid-template-columns: 1.4fr 1fr 1fr 1fr;
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
      max-width: 260px;
      font: 400 13px/1.6 var(--landing-font-ui);
      color: var(--landing-text-muted);
    }
    .footer__col {
      display: flex;
      flex-direction: column;
      gap: 11px;
    }
    .footer__col-title {
      font: 600 11px / normal var(--landing-font-ui);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--landing-text-faint);
    }
    .footer__link {
      font: 400 14px / normal var(--landing-font-ui);
      color: var(--landing-link);
      text-decoration: none;
    }
    .footer__link:hover {
      color: var(--landing-text);
    }
    .footer__bottom {
      border-top: 1px solid var(--landing-border-soft);
    }
    .footer__bottom-inner {
      max-width: var(--landing-container-width);
      margin: 0 auto;
      padding: 20px var(--landing-gutter);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .footer__mention {
      font: 400 13px / normal var(--landing-font-ui);
      color: var(--landing-text-faint);
    }
    .footer__mention-link {
      color: inherit;
      text-decoration: none;
    }
    .footer__mention-link:hover {
      color: var(--landing-text);
    }
    .footer__legal-links {
      display: flex;
      flex-direction: column;
      gap: 11px;
    }
    .footer__label-short {
      display: none;
    }
    @media (max-width: 1023px) {
      .footer__grid {
        padding: 32px var(--landing-gutter) 22px;
        grid-template-columns: 1fr 1fr;
        gap: 22px 16px;
      }
      .footer__brand,
      .footer__col--legal {
        grid-column: 1 / -1;
      }
      .footer__logo {
        font-size: 20px;
      }
      .footer__baseline,
      .footer__mention--secondary,
      .footer__label-full {
        display: none;
      }
      .footer__label-short {
        display: inline;
      }
      .footer__col {
        gap: 10px;
      }
      .footer__legal-links {
        flex-direction: row;
        flex-wrap: wrap;
        gap: 8px 18px;
      }
      .footer__legal-links .footer__link {
        font-size: 13.5px;
      }
      .footer__bottom {
        padding: 0 var(--landing-gutter);
        border-top: none;
      }
      .footer__bottom-inner {
        padding: 18px 0 calc(40px + var(--safe-bottom));
        border-top: 1px solid var(--landing-border-soft);
      }
      .footer__mention {
        font-size: 12.5px;
      }
    }
  `,
})
export class LandingFooter {
  readonly onLanding = input(true);

  protected readonly section = LANDING_SECTION;
  protected readonly legalLinks = LEGAL_DOCUMENTS;
  protected readonly copyrightYear = SITE_COPYRIGHT_YEAR;
  protected readonly siteName = SITE_NAME;
  protected readonly route = LANDING_ROUTE;
  protected readonly contactRoute = CONTACT_ROUTE;
  protected readonly nouveautesRoute = NOUVEAUTES_ROUTE;
  protected readonly problemParams = contactQueryParams({ motif: 'probleme' });

  protected anchor(section: LandingSectionId): string {
    return landingAnchorHref(section, this.onLanding());
  }
}
