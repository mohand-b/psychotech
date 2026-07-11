import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
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
import { AXIS_PRESENTATION } from '../../shared/ui/axis-presentation';
import { ChevronStep } from '../../shared/ui/chevron-stepper/chevron-stepper';
import { axisFromSlug } from '../../shared/util/axis-slug';
import { FocusedHeader } from '../../shared/ui/focused-header/focused-header';
import { formatDuration } from '../../shared/ui/format-duration';
import { Icon } from '../../shared/ui/icon/icon';
import { Navbar } from '../../shared/ui/navbar/navbar';

interface FocusedHeaderData {
  title?: string;
  backLabel?: string;
  backLink?: string;
  closeLink?: string;
  axisParam?: string;
  axisChip?: boolean;
  brandChip?: boolean;
  stepper?: boolean;
  showEnergy?: boolean;
  showTimer?: boolean;
  live?: boolean;
}

interface MobileFlowData {
  axisParam: string;
  suffix: string;
}

interface MobileFlowView {
  axis: AxisType;
  suffix: string;
}

interface FocusedHeaderView {
  title: string;
  backLabel: string;
  backLink: string;
  duration: string | null;
  closeLink: string | null;
  axisChip: AxisType | null;
  brandChip: boolean;
  stepper: boolean;
  showEnergy: boolean;
  live: boolean;
}

@Component({
  selector: 'app-connected-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Navbar, FocusedHeader, Icon],
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
  protected readonly mobileFlow = signal<MobileFlowView | null>(
    this.readMobileFlow(),
  );
  protected readonly hideMobileNav = signal(this.readHideMobileNav());
  protected readonly liveCountdown = this.trainingSessionFacade.remainingLabel;
  protected readonly liveCountdownSeverity =
    this.trainingSessionFacade.countdownSeverity;

  protected readonly sessionSteps = computed<ChevronStep[]>(() => {
    const session = this.trainingSessionFacade.session();
    if (!session) {
      return [];
    }
    return session.axisResults.map((result, index) => ({
      axis: result.axis,
      state:
        result.completedAt !== null || result.skipped
          ? 'done'
          : index === session.currentAxisIndex
            ? 'current'
            : 'todo',
    }));
  });

  private readonly currentAxisTraining = computed<AxisTraining | undefined>(
    () => {
      const axis = this.trainingSessionFacade.axis();
      return axis ? AXIS_TRAINING[axis as RailwayPlayableAxis] : undefined;
    },
  );

  protected readonly stepperDuration = computed(() => {
    const training = this.currentAxisTraining();
    return training && training.timer.model === AxisTimerModel.GLOBAL
      ? formatDuration(training.timer.durationSec)
      : null;
  });

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
      .subscribe(() => {
        this.focusedHeader.set(this.readFocusedHeader());
        this.mobileFlow.set(this.readMobileFlow());
        this.hideMobileNav.set(this.readHideMobileNav());
      });
  }

  protected mobileFlowPresentation(flow: MobileFlowView) {
    return AXIS_PRESENTATION[flow.axis];
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

  private deepestSnapshot() {
    let route: ActivatedRoute | null = this.route;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    return route?.snapshot;
  }

  private readHideMobileNav(): boolean {
    return this.deepestSnapshot()?.data?.['hideMobileNav'] === true;
  }

  private readMobileFlow(): MobileFlowView | null {
    const snapshot = this.deepestSnapshot();
    const data = snapshot?.data?.['mobileFlow'] as MobileFlowData | undefined;
    if (!data) {
      return null;
    }
    const axis = axisFromSlug(snapshot?.paramMap.get(data.axisParam) ?? null);
    return axis ? { axis, suffix: data.suffix } : null;
  }

  private readFocusedHeader(): FocusedHeaderView | null {
    const snapshot = this.deepestSnapshot();
    const data = snapshot?.data?.['focusedHeader'] as
      | FocusedHeaderData
      | undefined;
    if (!data) {
      return null;
    }
    const resolveLink = (link: string) =>
      link.replace(
        /:([A-Za-z]+)/g,
        (segment, name) => snapshot?.paramMap.get(name) ?? segment,
      );
    let title = data.title ?? '';
    let duration: string | null = null;
    let axisChip: AxisType | null = null;
    if (data.axisParam) {
      const axis = axisFromSlug(snapshot?.paramMap.get(data.axisParam) ?? null);
      if (axis) {
        title = data.title ?? AXIS_META[axis].label;
        axisChip = data.axisChip ? axis : null;
        const training: AxisTraining | undefined =
          AXIS_TRAINING[axis as RailwayPlayableAxis];
        const durationSec =
          training &&
          data.showTimer !== false &&
          training.timer.model === AxisTimerModel.GLOBAL
            ? training.timer.durationSec
            : null;
        duration = durationSec === null ? null : formatDuration(durationSec);
      }
    }
    return {
      title,
      backLabel: data.backLabel ?? '',
      backLink: resolveLink(data.backLink ?? ''),
      duration,
      closeLink: data.closeLink ? resolveLink(data.closeLink) : null,
      axisChip,
      brandChip: data.brandChip ?? false,
      stepper: data.stepper ?? false,
      showEnergy: data.showEnergy ?? true,
      live: data.live ?? (snapshot?.paramMap.has('sessionId') ?? false),
    };
  }
}
