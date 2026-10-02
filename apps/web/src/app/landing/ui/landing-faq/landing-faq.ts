import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LANDING_FAQ_ENTRIES } from '../../data/landing-faq-entries';
import { LANDING_SECTION } from '../../util/landing-sections';
import { LandingReveal } from '../landing-reveal';

@Component({
  selector: 'app-landing-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal],
  template: `
    <section class="faq" [id]="sectionId">
      <div class="faq__inner">
        <div class="faq__head" appLandingReveal>
          <span class="faq__eyebrow">Questions fréquentes</span>
          <h2 class="faq__title">
            Tout ce qu'il faut savoir avant de commencer
          </h2>
        </div>
        <div class="faq__list">
          @for (entry of faq; track entry.question; let index = $index) {
            <div class="faq__item" [appLandingReveal]="index">
              <h3 class="faq__question">{{ entry.question }}</h3>
              <p class="faq__answer">{{ entry.answer }}</p>
            </div>
          }
          <span class="faq__rule" aria-hidden="true"></span>
        </div>
      </div>
    </section>
  `,
  styles: `
    .faq {
      background: var(--card);
      color: var(--ink);
      scroll-margin-top: var(--landing-header-height);
    }
    .faq__inner {
      max-width: 820px;
      margin: 0 auto;
      padding: var(--landing-section-space) 32px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    .faq__head {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .faq__eyebrow {
      font: 600 11px / normal var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--landing-accent);
    }
    .faq__title {
      font: 600 40px/1.1 var(--landing-font-display);
      letter-spacing: -0.02em;
    }
    .faq__list {
      display: flex;
      flex-direction: column;
    }
    .faq__item {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 28px 0;
      border-top: 1px solid var(--border);
    }
    .faq__question {
      font: 600 16.5px/24px var(--landing-font-ui);
    }
    .faq__answer {
      font: 400 14.5px/1.65 var(--landing-font-ui);
      color: var(--text-secondary);
    }
    .faq__rule {
      border-top: 1px solid var(--border);
    }
    @media (max-width: 1023px) {
      .faq__inner {
        max-width: var(--landing-container-width);
        padding: var(--landing-section-space) var(--landing-gutter);
        gap: 20px;
      }
      .faq__head {
        gap: 10px;
      }
      .faq__title {
        font-size: 28px;
        line-height: 1.12;
      }
      .faq__list {
        gap: 10px;
      }
      .faq__item {
        gap: 6px;
        padding: 18px 0;
      }
      .faq__question {
        font-size: 15px;
        line-height: 1.35;
      }
      .faq__answer {
        font-size: 13.5px;
        line-height: 1.6;
      }
    }
  `,
})
export class LandingFaq {
  protected readonly sectionId = LANDING_SECTION.faq;
  protected readonly faq = LANDING_FAQ_ENTRIES;
}
