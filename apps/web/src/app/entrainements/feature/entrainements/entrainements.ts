import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AxisType,
  FULL_SESSION_AXIS_ORDER,
  FULL_SESSION_LABEL,
  Sector,
  SECTOR_LABELS,
  SimulationStamp,
  TrainingsLastSimulationDto,
  buildSimulationStamp,
} from '@psychotech/shared';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  GraduationCap,
  Lock,
  Play,
} from 'lucide-angular';
import { map } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import {
  AXIS_PRESENTATION,
  AxisPresentation,
} from '../../../shared/ui/axis-presentation';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { SectorChip } from '../../../shared/ui/sector-chip/sector-chip';
import { StampBadge } from '../../../shared/ui/stamp-badge/stamp-badge';
import { ThresholdBar } from '../../../shared/ui/threshold-bar/threshold-bar';
import { axisSlug } from '../../../shared/util/axis-slug';
import { formatFrenchDecimal } from '../../../shared/util/format-number';
import { TrainingsOverviewFacade } from '../../data-access/trainings-overview.facade';
import {
  AXIS_OVERVIEW_COPY,
  SignedGap,
  TrainingsPanel,
  formatOverviewDate,
  formatSignedGap,
} from './trainings-overview-view';

interface AxisRowView {
  axis: AxisType;
  link: string[];
  presentation: AxisPresentation;
  description: string;
  mobileDescription: string;
  scoreLabel: string;
  barWidth: number;
  neverPlayed: boolean;
}

interface TutorialAxisView {
  axis: AxisType;
  link: string[];
  presentation: AxisPresentation;
}

interface LastSimulationView {
  scoreLabel: string;
  stamp: SimulationStamp;
  barWidth: number;
  markerLeft: number;
  threshold: number;
  gap: SignedGap;
  dateLabel: string;
}

@Component({
  selector: 'app-entrainements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BoltIcon,
    Button,
    Icon,
    RouterLink,
    SectorChip,
    Skeleton,
    StampBadge,
    ThresholdBar,
  ],
  providers: [TrainingsOverviewFacade],
  templateUrl: './entrainements.html',
  styleUrl: './entrainements.css',
})
export class Entrainements {
  private readonly authFacade = inject(AuthFacade);
  private readonly facade = inject(TrainingsOverviewFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly checkIcon = CircleCheckBig;
  protected readonly chevronRightIcon = ChevronRight;
  protected readonly chevronLeftIcon = ChevronLeft;
  protected readonly arrowRightIcon = ArrowRight;
  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly lockIcon = Lock;
  protected readonly graduationIcon = GraduationCap;
  protected readonly playIcon = Play;
  protected readonly fullSessionLabel = FULL_SESSION_LABEL;

  protected readonly fullSessionFeatures = [
    'Notation pondérée par secteur',
    "Conditions réelles d'examen",
    'Analyse globale et par axe',
    "Sans aide ni option d'entraînement",
  ];

  protected readonly targetedFeatures = [
    '1 axe au choix, parmi les cinq',
    'Sessions courtes, retour immédiat',
    'Idéal pour cibler un point faible',
    "Options d'entraînement selon l'axe",
  ];

  private readonly panelParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('panel'))),
    { initialValue: this.route.snapshot.queryParamMap.get('panel') },
  );

  protected readonly panel = linkedSignal<TrainingsPanel>(() =>
    this.panelParam() === 'cible' ? 'cible' : 'sim',
  );

  protected readonly firstName =
    this.authFacade.currentUser()?.firstName ?? null;

  protected readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
  protected readonly sectorLabel = SECTOR_LABELS[this.sector];

  protected readonly animationsReady = signal(false);

  constructor() {
    this.facade.load(this.sector);
    afterNextRender(() => {
      requestAnimationFrame(() => this.animationsReady.set(true));
    });
  }

  protected readonly axisRows = computed<AxisRowView[]>(() => {
    const overview = this.facade.overview();
    if (!overview) {
      return [];
    }
    return overview.axes.map((entry) => {
      const copy = AXIS_OVERVIEW_COPY[entry.axis];
      return {
        axis: entry.axis,
        link: ['/entrainements/cible', axisSlug(entry.axis)],
        presentation: AXIS_PRESENTATION[entry.axis],
        description: copy?.description ?? '',
        mobileDescription: copy?.mobileDescription ?? '',
        scoreLabel:
          entry.bestScore === null ? '-' : `${Math.round(entry.bestScore)}`,
        barWidth: entry.bestScore ?? 0,
        neverPlayed: entry.neverPlayed,
      };
    });
  });

  protected readonly tutorialAxes: TutorialAxisView[] =
    FULL_SESSION_AXIS_ORDER.map((axis) => ({
      axis,
      link: ['/entrainements/tutoriel', axisSlug(axis)],
      presentation: AXIS_PRESENTATION[axis],
    }));

  protected readonly lastSimulation = computed<LastSimulationView | null>(
    () => {
      const simulation = this.facade.overview()?.lastSimulation ?? null;
      return simulation ? this.toLastSimulationView(simulation) : null;
    },
  );

  protected readonly overviewLoaded = computed(
    () => this.facade.overview() !== null,
  );

  protected readonly overviewError = computed(
    () => this.facade.error() !== undefined && this.facade.error() !== null,
  );

  protected readonly overviewPending = computed(
    () => !this.overviewLoaded() && !this.overviewError(),
  );

  protected readonly skeletonAxisRows = [0, 1, 2, 3, 4];

  protected retryOverview(): void {
    this.facade.reload();
  }

  protected openPanel(panel: TrainingsPanel): void {
    this.panel.set(panel);
  }

  protected startSimulation(): void {
    this.router.navigate(['/entrainements/examen-blanc']);
  }

  private toLastSimulationView(
    simulation: TrainingsLastSimulationDto,
  ): LastSimulationView {
    return {
      scoreLabel: formatFrenchDecimal(simulation.globalScore),
      stamp: buildSimulationStamp(
        simulation.globalScore,
        simulation.sectorThreshold,
        simulation.isEliminated,
      ),
      barWidth: simulation.globalScore,
      markerLeft: simulation.sectorThreshold,
      threshold: simulation.sectorThreshold,
      gap: formatSignedGap(simulation),
      dateLabel: formatOverviewDate(simulation.completedAt, new Date()),
    };
  }
}
