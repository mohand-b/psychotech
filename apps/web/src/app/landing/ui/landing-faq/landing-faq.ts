import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LandingReveal } from '../landing-reveal.directive';

interface FaqEntry {
  question: string;
  answer: string;
}

const DESKTOP_FAQ: FaqEntry[] = [
  {
    question: "À qui s'adresse PsychoTech ?",
    answer:
      'Aux candidats qui préparent une sélection professionnelle comportant des tests psychotechniques. Les épreuves, barèmes et seuils sont calibrés secteur par secteur.',
  },
  {
    question: 'Les exercices se répètent-ils ?',
    answer:
      "Non : chaque session est inédite. Impossible d'apprendre les réponses par cœur, vous entraînez la compétence réelle et votre score reflète votre vrai niveau.",
  },
  {
    question: 'Quels secteurs sont couverts ?',
    answer:
      "Le secteur ferroviaire est disponible aujourd'hui. D'autres secteurs (médical, aviation, sécurité, industrie) sont en préparation et s'ajouteront avec leurs propres barèmes.",
  },
  {
    question: 'Comment commencer ?',
    answer:
      'Créez un compte gratuitement : le mode découverte de chaque axe est en accès libre, sans carte bancaire. Vous choisissez ensuite la formule qui correspond à votre rythme.',
  },
];

const MOBILE_FAQ: FaqEntry[] = [
  {
    question: "À qui s'adresse PsychoTech ?",
    answer:
      "Aux candidats préparant une sélection à tests psychotechniques - aujourd'hui le secteur ferroviaire.",
  },
  {
    question: 'Les exercices se répètent-ils ?',
    answer:
      "Non : chaque session est inédite, impossible d'apprendre par cœur.",
  },
  {
    question: 'Quels secteurs ?',
    answer:
      "Ferroviaire aujourd'hui ; médical, aviation, sécurité, industrie à venir.",
  },
  {
    question: 'Puis-je annuler ?',
    answer:
      "Oui, à tout moment. Accès conservé jusqu'à la fin de la période payée.",
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
          <h2 class="faq__title faq__title--desktop">
            Tout ce qu'il faut savoir avant de commencer
          </h2>
          <h2 class="faq__title faq__title--mobile">Avant de commencer</h2>
        </div>
        <div class="faq__list">
          @for (entry of desktopFaq; track entry.question) {
            <div class="faq__row" appLandingReveal>
              <span class="faq__question">{{ entry.question }}</span>
              <span class="faq__answer">{{ entry.answer }}</span>
            </div>
          }
        </div>
        <div class="faq__cards">
          @for (entry of mobileFaq; track entry.question) {
            <div class="faq__card">
              <span class="faq__question faq__question--mobile">{{
                entry.question
              }}</span>
              <span class="faq__answer faq__answer--mobile">{{
                entry.answer
              }}</span>
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
    .faq__title--mobile {
      display: none;
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
    .faq__cards {
      display: none;
      flex-direction: column;
      gap: 10px;
    }
    .faq__card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-card);
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .faq__question--mobile {
      font-size: 14px;
      line-height: 20px;
    }
    .faq__answer--mobile {
      font-size: 13px;
      line-height: 1.55;
    }
    @media (max-width: 767px) {
      .faq {
        background: var(--bg);
        border-top: 1px solid var(--border);
      }
      .faq__inner {
        padding: 40px 24px;
      }
      .faq__head {
        gap: 8px;
        text-align: center;
        margin-bottom: 24px;
      }
      .faq__title--desktop {
        display: none;
      }
      .faq__title--mobile {
        display: block;
        font-size: 24px;
        line-height: 1.14;
      }
      .faq__list {
        display: none;
      }
      .faq__cards {
        display: flex;
      }
    }
  `,
})
export class LandingFaq {
  protected readonly desktopFaq = DESKTOP_FAQ;
  protected readonly mobileFaq = MOBILE_FAQ;
}
