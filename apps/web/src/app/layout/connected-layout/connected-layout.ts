import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import {
  AXIS_META,
  AXIS_TRAINING,
  AxisTimerModel,
  AxisType,
  AxisTraining,
  RailwayPlayableAxis,
} from '@psychotech/shared';
import { filter } from 'rxjs';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import { FocusedHeader } from '../../shared/ui/focused-header/focused-header';
import { formatDuration } from '../../shared/ui/format-duration';
import { Navbar } from '../../shared/ui/navbar/navbar';

interface FocusedHeaderData {
  title?: string;
  backLabel: string;
  backLink: string;
  closeLink?: string;
  axisParam?: string;
  axisChip?: boolean;
  showEnergy?: boolean;
  showHelp?: boolean;
}

interface FocusedHeaderView {
  title: string;
  backLabel: string;
  backLink: string;
  duration: string | null;
  closeLink: string | null;
  axisChip: AxisType | null;
  showEnergy: boolean;
  helpText: string | null;
  live: boolean;
}

@Component({
  selector: 'app-connected-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Navbar, FocusedHeader],
  templateUrl: './connected-layout.html',
  styleUrl: './connected-layout.css',
})
export class ConnectedLayout {
  private readonly energyFacade = inject(EnergyFacade);
  private readonly trainingSessionFacade = inject(TrainingSessionFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly focusedHeader = signal<FocusedHeaderView | null>(
    this.readFocusedHeader(),
  );
  protected readonly liveCountdown = this.trainingSessionFacade.remainingLabel;
  protected readonly liveCountdownSeverity =
    this.trainingSessionFacade.countdownSeverity;

  constructor() {
    this.energyFacade
      .load()
      .pipe(takeUntilDestroyed())
      .subscribe({ error: () => undefined });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.focusedHeader.set(this.readFocusedHeader()));
  }

  protected onCloseRequested(header: FocusedHeaderView): void {
    if (header.live) {
      this.trainingSessionFacade.requestClose();
      return;
    }
    if (header.closeLink) {
      this.router.navigateByUrl(header.closeLink);
    }
  }

  private readFocusedHeader(): FocusedHeaderView | null {
    let route: ActivatedRoute | null = this.route;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    const snapshot = route?.snapshot;
    const data = snapshot?.data?.['focusedHeader'] as
      | FocusedHeaderData
      | undefined;
    if (!data) {
      return null;
    }
    let title = data.title ?? '';
    let duration: string | null = null;
    let axisChip: AxisType | null = null;
    let helpText: string | null = null;
    if (data.axisParam) {
      const axis = snapshot?.paramMap.get(data.axisParam) as AxisType | null;
      if (axis) {
        title = data.title ?? AXIS_META[axis].label;
        axisChip = data.axisChip ? axis : null;
        const training: AxisTraining | undefined =
          AXIS_TRAINING[axis as RailwayPlayableAxis];
        const durationSec =
          training && training.timer.model === AxisTimerModel.GLOBAL
            ? training.timer.durationSec
            : null;
        duration = durationSec === null ? null : formatDuration(durationSec);
        helpText = data.showHelp && training ? training.briefing.consigne : null;
      }
    }
    return {
      title,
      backLabel: data.backLabel,
      backLink: data.backLink,
      duration,
      closeLink: data.closeLink ?? null,
      axisChip,
      showEnergy: data.showEnergy ?? true,
      helpText,
      live: snapshot?.paramMap.has('sessionId') ?? false,
    };
  }
}
