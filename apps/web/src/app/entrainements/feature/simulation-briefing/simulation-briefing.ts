import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionDto, SessionMode, SessionStatus } from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { Button } from '../../../shared/ui/button/button';
import { axisSlug } from '../../../shared/util/axis-slug';
import { axisButtonColor } from '../../ui/axis-button-color';
import { AxisBriefing } from '../../ui/axis-briefing/axis-briefing';

@Component({
  selector: 'app-simulation-briefing',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisBriefing, Button],
  templateUrl: './simulation-briefing.html',
  styleUrl: './simulation-briefing.css',
})
export class SimulationBriefing {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';

  protected readonly loaded = signal(false);
  protected readonly axis = this.facade.axis;

  protected readonly positionLabel = computed(() => {
    const session = this.facade.session();
    if (!session) {
      return null;
    }
    return `Axe ${session.currentAxisIndex + 1}/${session.axisResults.length}`;
  });

  protected readonly admissibilityThreshold = computed(
    () => this.facade.session()?.sectorThreshold ?? null,
  );

  protected readonly buttonColor = computed(() => {
    const axis = this.axis();
    return axis ? axisButtonColor(axis) : 'brand';
  });

  constructor() {
    const active = this.facade.session();
    if (active?.id === this.sessionId) {
      this.handleLoaded(active);
    } else {
      this.facade.load(this.sessionId).subscribe({
        next: (session) => this.handleLoaded(session),
        error: () => this.router.navigate(['/entrainements']),
      });
    }
  }

  protected start(): void {
    const axis = this.axis();
    if (!this.loaded() || !axis) {
      return;
    }
    this.router.navigate([
      '/entrainements/simulation/session',
      this.sessionId,
      'axe',
      axisSlug(axis),
    ]);
  }

  private handleLoaded(session: SessionDto): void {
    if (session.mode !== SessionMode.FULL) {
      this.router.navigate(['/entrainements']);
      return;
    }
    if (session.status === SessionStatus.COMPLETED) {
      this.router.navigate(['/sessions', session.id, 'resultat']);
      return;
    }
    if (session.status !== SessionStatus.IN_PROGRESS) {
      this.router.navigate(['/entrainements']);
      return;
    }
    this.loaded.set(true);
  }
}
