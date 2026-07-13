import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-offers',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="page-shell offers">
      <h1 class="offers__title">Nos offres</h1>
      <p class="offers__hint">
        La page des offres est en préparation. Vous pourrez bientôt comparer les
        formules Essentiel et Illimité et gérer votre abonnement ici.
      </p>
      <a routerLink="/entrainements" class="offers__back"
        >Revenir aux entraînements</a
      >
    </section>
  `,
  styles: `
    .offers {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .offers__title {
      font: 700 34px/1.1 var(--font-display);
      margin: 0;
      color: var(--ink);
    }
    .offers__hint {
      font: 400 15px/1.55 var(--font-ui);
      color: var(--text-secondary);
      margin: 0;
      max-width: 480px;
    }
    .offers__back {
      font: 600 14px/20px var(--font-ui);
      color: var(--brand);
      text-decoration: none;
    }
    .offers__back:hover {
      color: var(--brand-hover);
    }
  `,
})
export class Offers {}
