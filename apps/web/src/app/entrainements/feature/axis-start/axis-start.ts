import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AxisType, Sector } from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { Button } from '../../../shared/ui/button/button';
import { axisButtonColor } from '../../ui/axis-button-color';
import { AxisBriefing } from '../../ui/axis-briefing/axis-briefing';

@Component({
  selector: 'app-axis-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisBriefing, Button],
  templateUrl: './axis-start.html',
  styleUrl: './axis-start.css',
})
export class AxisStart {
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly trainingSessionFacade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly starting = signal(false);
  protected readonly helpEnabled = signal(false);

  protected readonly axis = this.route.snapshot.paramMap.get(
    'axis',
  ) as AxisType;
  protected readonly buttonColor = axisButtonColor(this.axis);

  private readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
  private readonly referential = toSignal(
    this.catalogFacade.getSector(this.sector),
  );
  protected readonly admissibilityThreshold = computed(
    () => this.referential()?.admissibilityThreshold ?? null,
  );

  protected start(): void {
    if (this.starting()) {
      return;
    }
    this.starting.set(true);
    this.trainingSessionFacade
      .startTargeted(this.axis, { helpEnabled: this.helpEnabled() })
      .subscribe({
        next: (session) =>
          this.router.navigate([
            '/entrainements/cible',
            this.axis,
            'session',
            session.id,
          ]),
        error: () => this.starting.set(false),
      });
  }
}
