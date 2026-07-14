import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LandingReveal } from '../landing-reveal.directive';

interface FaqEntry {
  question: string;
  answer: string;
}

const FAQ_ENTRIES: FaqEntry[] = [
  {
    question: "À qui s'adresse PsychoTech ?",
    answer:
      'Aux candidats qui préparent une sélection professionnelle comportant des tests psychotechniques. Les épreuves, barèmes et seuils sont calibrés secteur par secteur.',
  },
  {
    question: 'Les exercices se répètent-ils ?',
    answer:
      "Non : chaque session est inédite. Impossible d'apprendre les réponses par cœur, vous entraînez la compétence réelle et votre score reflète votre vrai niveau.",
  },
  {
    question: 'Quels secteurs sont couverts ?',
    answer:
      "Le secteur ferroviaire est disponible aujourd'hui. D'autres secteurs (médical, aviation, sécurité, industrie) sont en préparation et s'ajouteront avec leurs propres barèmes.",
  },
  {
    question: 'Comment commencer ?',
    answer:
      'Créez un compte gratuitement : le mode découverte de chaque axe est en accès libre, sans carte bancaire. Vous choisissez ensuite la formule qui correspond à votre rythme.',
  },
];

@Component({
  selector: 'app-landing-faq',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LandingReveal],
  template: `
    <section class="faq" id="faq">
      <div class="faq__inner">
        <div class="faq__head" appLandingReveal>
          <span class="faq__eyebrow">Questions fréquentes</span>
          <h2 class="faq__title">
            Tout ce qu'il faut savoir avant de commencer
          </h2>
        </div>
        <div class="faq__list">
          @for (entry of faq; track entry.question) {
            <div class="faq__row" appLandingReveal>
              <span class="faq__question">{{ entry.question }}</span>
              <span class="faq__answer">{{ entry.answer }}</span>
            </div>
          }
        </div>
      </div>
    </section>
  `,
  styles: `
    .faq {
      background: var(--card);
      scroll-margin-top: calc(64px + env(safe-area-inset-top));
    }
    .faq__inner {
      max-width: 820px;
      margin: 0 auto;
      padding: 72px 32px;
    }
    .faq__head {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 32px;
    }
    .faq__eyebrow {
      font: 600 11px/14px var(--landing-font-ui);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--label);
    }
    .faq__title {
      font: 600 34px/1.12 var(--landing-font-display);
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--ink);
    }
    .faq__list {
      display: flex;
      flex-direction: column;
    }
    .faq__row {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 28px 0;
      border-top: 1px solid var(--border);
    }
    .faq__row:last-child {
      border-bottom: 1px solid var(--border);
    }
    .faq__question {
      font: 600 16.5px/24px var(--landing-font-ui);
      color: var(--ink);
    }
    .faq__answer {
      font: 400 14.5px/1.65 var(--landing-font-ui);
      color: var(--text-secondary);
    }
    @media (max-width: 767px) {
      .faq__inner {
        padding: 56px 20px;
      }
      .faq__head {
        gap: 12px;
        margin-bottom: 24px;
      }
      .faq__title {
        font-size: 25px;
        line-height: 1.15;
      }
      .faq__row {
        gap: 8px;
        padding: 20px 0;
      }
      .faq__question {
        font-size: 15px;
        line-height: 22px;
      }
      .faq__answer {
        font-size: 13.5px;
        line-height: 1.6;
      }
    }
  `,
})
export class LandingFaq {
  protected readonly faq = FAQ_ENTRIES;
}
