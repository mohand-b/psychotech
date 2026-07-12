import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AxisType, Sector, TrainingOptionId } from '@psychotech/shared';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Button } from '../../../shared/ui/button/button';
import { axisFromSlug, axisSlug } from '../../../shared/util/axis-slug';
import { axisButtonColor } from '../../ui/axis-button-color';
import { AxisBriefing } from '../../ui/axis-briefing/axis-briefing';

const TARGETED_AXIS_ENERGY_COST = 1;

@Component({
  selector: 'app-axis-start',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisBriefing, BoltIcon, Button],
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
  protected readonly enabledOptions = signal<TrainingOptionId[]>([]);
  protected readonly energyCost = TARGETED_AXIS_ENERGY_COST;

  protected readonly axis =
    axisFromSlug(this.route.snapshot.paramMap.get('axis')) ?? AxisType.LOGIC;
  protected readonly buttonColor = axisButtonColor(this.axis);

  private readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;

  constructor() {
    if (axisFromSlug(this.route.snapshot.paramMap.get('axis')) === null) {
      this.router.navigate(['/entrainements'], {
        queryParams: { panel: 'cible' },
      });
    }
  }
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
      .startTargeted(this.axis, { enabledOptions: this.enabledOptions() })
      .subscribe({
        next: (session) =>
          this.router.navigate([
            '/entrainements/cible',
            axisSlug(this.axis),
            'session',
            session.id,
          ]),
        error: () => this.starting.set(false),
      });
  }
}
