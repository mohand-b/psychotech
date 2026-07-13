import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  SECTOR_LABELS,
  Sector,
  SubscriptionTier,
  TrainingsLastSimulationDto,
} from '@psychotech/shared';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  CircleCheckBig,
  GraduationCap,
  LayoutGrid,
  Lock,
  Play,
  Timer,
} from 'lucide-angular';
import { map } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import {
  AXIS_PRESENTATION,
  AxisPresentation,
} from '../../../shared/ui/axis-presentation';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { BAND_COLOR_VARS, BAND_LABELS } from '../../../shared/ui/score-rating';
import { SectorChip } from '../../../shared/ui/sector-chip/sector-chip';
import { axisSlug } from '../../../shared/util/axis-slug';
import { TrainingsOverviewFacade } from '../../data-access/trainings-overview.facade';
import {
  AXIS_OVERVIEW_COPY,
  SignedGap,
  TrainingsVoletView,
  formatOverviewDate,
  formatOverviewScore,
  formatRechargeCountdown,
  formatSignedGap,
} from './trainings-overview-view';

const REFRESH_INTERVAL_MS = 60_000;

interface AxisRowView {
  axis: AxisType;
  link: string[];
  presentation: AxisPresentation;
  description: string;
  mobileDescription: string;
  scoreLabel: string;
  barWidth: number;
  neverPlayed: boolean;
  isCriticalAxis: boolean;
  needsWork: boolean;
}

interface TutorialAxisView {
  axis: AxisType;
  link: string[];
  presentation: AxisPresentation;
}

interface LastSimulationView {
  sessionId: string;
  scoreLabel: string;
  bandLabel: string;
  bandColorVar: string;
  barWidth: number;
  markerLeft: number;
  threshold: number;
  gap: SignedGap;
  dateLabel: string;
}

@Component({
  selector: 'app-entrainements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BoltIcon, Button, Icon, RouterLink, SectorChip],
  providers: [TrainingsOverviewFacade],
  templateUrl: './entrainements.html',
  styleUrl: './entrainements.css',
})
export class Entrainements {
  private readonly authFacade = inject(AuthFacade);
  private readonly coreFacade = inject(CoreFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly facade = inject(TrainingsOverviewFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly checkIcon = CircleCheckBig;
  protected readonly chevronRightIcon = ChevronRight;
  protected readonly arrowRightIcon = ArrowRight;
  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly lockIcon = Lock;
  protected readonly graduationIcon = GraduationCap;
  protected readonly playIcon = Play;
  protected readonly timerIcon = Timer;
  protected readonly gridIcon = LayoutGrid;

  protected readonly simulationFeatures = [
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

  protected readonly mobileTargetedFeatures = [
    'Sessions courtes de 3 à 5 minutes',
    'Résultat immédiat et correction détaillée',
    'Progression mesurable axe par axe',
  ];

  private readonly panelParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('panel'))),
    { initialValue: this.route.snapshot.queryParamMap.get('panel') },
  );

  protected readonly view = linkedSignal<TrainingsVoletView>(() =>
    this.panelParam() === 'sim' ? 'bilan' : 'axes',
  );

  protected readonly firstName =
    this.authFacade.currentUser()?.firstName ?? null;

  protected readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
  protected readonly sectorLabel = SECTOR_LABELS[this.sector];

  protected readonly mobileSimulationFeatures = [
    "Conditions réelles d'examen, sans interruption",
    `Avis d'admissibilité vs seuil ${this.sectorLabel}`,
    'Bilan détaillé et recommandations par axe',
  ];

  protected readonly tier = this.coreFacade.tier;
  protected readonly isFree = computed(
    () => this.tier() === SubscriptionTier.FREE,
  );
  protected readonly isEssential = computed(
    () => this.tier() === SubscriptionTier.ESSENTIAL,
  );

  private readonly now = signal(new Date());

  protected readonly rechargeLabel = computed(() => {
    const resetsAt = this.energyFacade.state()?.resetsAt;
    return resetsAt ? formatRechargeCountdown(resetsAt, this.now()) : null;
  });

  constructor() {
    this.facade.load(this.sector);
    const intervalId = setInterval(
      () => this.now.set(new Date()),
      REFRESH_INTERVAL_MS,
    );
    this.destroyRef.onDestroy(() => clearInterval(intervalId));
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
        isCriticalAxis: entry.isCriticalAxis,
        needsWork: entry.needsWork,
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

  protected toggleView(): void {
    this.view.set(this.view() === 'axes' ? 'bilan' : 'axes');
  }

  protected startSimulation(): void {
    this.router.navigate(['/entrainements/simulation']);
  }

  private toLastSimulationView(
    simulation: TrainingsLastSimulationDto,
  ): LastSimulationView {
    return {
      sessionId: simulation.sessionId,
      scoreLabel: formatOverviewScore(simulation.globalScore),
      bandLabel: BAND_LABELS[simulation.globalBand],
      bandColorVar: BAND_COLOR_VARS[simulation.globalBand],
      barWidth: simulation.globalScore,
      markerLeft: simulation.sectorThreshold,
      threshold: simulation.sectorThreshold,
      gap: formatSignedGap(simulation),
      dateLabel: formatOverviewDate(simulation.completedAt, new Date()),
    };
  }
}
