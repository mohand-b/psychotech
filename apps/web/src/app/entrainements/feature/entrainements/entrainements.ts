import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AxisType,
  SECTOR_LABELS,
  Sector,
  TrainingsLastSimulationDto,
} from '@psychotech/shared';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  TrainFront,
  Zap,
} from 'lucide-angular';
import { map } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import {
  AXIS_PRESENTATION,
  AxisPresentation,
} from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { BAND_COLOR_VARS, BAND_LABELS } from '../../../shared/ui/score-rating';
import { axisSlug } from '../../../shared/util/axis-slug';
import { TrainingsOverviewFacade } from '../../data-access/trainings-overview.facade';
import {
  AXIS_OVERVIEW_COPY,
  SignedGap,
  TrainingsPanel,
  formatOverviewDate,
  formatOverviewScore,
  formatSignedGap,
  resolveAxisTag,
} from './trainings-overview-view';

interface AxisRowView {
  axis: AxisType;
  link: string[];
  presentation: AxisPresentation;
  description: string;
  mobileDescription: string;
  tag: string | null;
  scoreLabel: string | null;
  barWidth: number;
  neverPlayed: boolean;
}

interface LastSimulationView {
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
  imports: [Button, Icon, RouterLink],
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
  protected readonly energyIcon = Zap;

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
  protected readonly chevronRightIcon = ChevronRight;
  protected readonly chevronLeftIcon = ChevronLeft;
  protected readonly arrowRightIcon = ArrowRight;
  protected readonly arrowLeftIcon = ArrowLeft;
  protected readonly sectorIcon = TrainFront;

  private readonly panelParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('panel'))),
    { initialValue: this.route.snapshot.queryParamMap.get('panel') },
  );

  protected readonly panel = linkedSignal<TrainingsPanel>(() =>
    this.panelParam() === 'cible' ? 'cible' : 'sim',
  );

  protected readonly firstName =
    this.authFacade.currentUser()?.firstName ?? null;

  private readonly sector =
    this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY;
  protected readonly sectorLabel = SECTOR_LABELS[this.sector];

  constructor() {
    this.facade.load(this.sector);
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
        tag: resolveAxisTag(entry),
        scoreLabel:
          entry.bestScore === null ? null : `${Math.round(entry.bestScore)}`,
        barWidth: entry.bestScore ?? 0,
        neverPlayed: entry.neverPlayed,
      };
    });
  });

  protected readonly lastSimulation = computed<LastSimulationView | null>(
    () => {
      const simulation = this.facade.overview()?.lastSimulation ?? null;
      return simulation ? this.toLastSimulationView(simulation) : null;
    },
  );

  protected readonly overviewLoaded = computed(
    () => this.facade.overview() !== null,
  );

  protected openPanel(panel: TrainingsPanel): void {
    this.panel.set(panel);
  }

  protected startSimulation(): void {
    this.router.navigate(['/entrainements/simulation']);
  }

  private toLastSimulationView(
    simulation: TrainingsLastSimulationDto,
  ): LastSimulationView {
    return {
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
