import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AXIS_META } from '@psychotech/shared';
import { axisFromSlug } from '../../../shared/util/axis-slug';

@Component({
  selector: 'app-tutorial-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <section class="page-shell tutorial">
      <h1 class="tutorial__title">Tutoriel {{ axisLabel }}</h1>
      <p class="tutorial__hint">
        Le tutoriel guidé de cet axe est en préparation. Ce sera un aperçu
        très court et volontairement limité : 5 items fixes, gratuits et sans
        énergie, juste pour découvrir l'épreuve.
      </p>
      <a routerLink="/entrainements" class="tutorial__back"
        >Revenir aux entraînements</a
      >
    </section>
  `,
  styles: `
    .tutorial {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .tutorial__title {
      font: 700 34px/1.1 var(--font-display);
      margin: 0;
      color: var(--ink);
    }
    .tutorial__hint {
      font: 400 15px/1.55 var(--font-ui);
      color: var(--text-secondary);
      margin: 0;
      max-width: 480px;
    }
    .tutorial__back {
      font: 600 14px/20px var(--font-ui);
      color: var(--brand);
      text-decoration: none;
    }
    .tutorial__back:hover {
      color: var(--brand-hover);
    }
  `,
})
export class TutorialStart {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly axis = axisFromSlug(
    this.route.snapshot.paramMap.get('axis'),
  );

  protected readonly axisLabel = this.axis ? AXIS_META[this.axis].label : '';

  constructor() {
    if (this.axis === null) {
      this.router.navigate(['/entrainements']);
    }
  }
}
