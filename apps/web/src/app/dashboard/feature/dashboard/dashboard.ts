import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AxisProgressStatus,
  AxisType,
  BADGE_BY_ID,
  BadgeStatusDto,
  FULL_SESSION_AXIS_ORDER,
  FULL_SESSION_LABEL,
  RailwayPlayableAxis,
  SESSION_ENERGY_COST,
  Sector,
  SessionMode,
  SimulationStamp,
  axisMaxDurationSec,
  buildSimulationStamp,
} from '@psychotech/shared';
import { ArrowRight, ChevronRight, Play, Target } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { API_BASE_URL } from '../../../core/http/api-base-url.token';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { TrainingsOverviewFacade } from '../../../entrainements/data-access/trainings-overview.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { SessionHistoryFacade } from '../../../sessions/data-access/session-history.facade';
import {
  AxisRadar,
  AxisRadarEntry,
} from '../../../shared/ui/axis-radar/axis-radar';
import {
  AXIS_PRESENTATION,
  AxisPresentation,
} from '../../../shared/ui/axis-presentation';
import {
  AXIS_ICON_SIZE,
  AxisIcon,
} from '../../../shared/ui/axis-icon/axis-icon';
import { AxisLabel } from '../../../shared/ui/axis-label/axis-label';
import { Button } from '../../../shared/ui/button/button';
import {
  ChevronStep,
  ChevronStepper,
} from '../../../shared/ui/chevron-stepper/chevron-stepper';
import { Icon } from '../../../shared/ui/icon/icon';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { SectorChip } from '../../../shared/ui/sector-chip/sector-chip';
import { CountUp } from '../../../shared/ui/motion/count-up';
import { MotionOnce } from '../../../shared/ui/motion/motion-once';
import { Skeleton } from '../../../shared/ui/skeleton/skeleton';
import { StampBadge } from '../../../shared/ui/stamp-badge/stamp-badge';
import { BadgeFeedBanner } from '../badge-feed-banner/badge-feed-banner';
import { Clock } from '../../../shared/util/clock';
import { ThresholdBar } from '../../../shared/ui/threshold-bar/threshold-bar';
import { axisSlug } from '../../../shared/util/axis-slug';
import { formatFrenchDecimal } from '../../../shared/util/format-number';
import { formatSessionDate } from '../../../shared/util/format-session-date';

type DayVariant = 'session' | 'train' | 'new';
type RadarMode = 'derniere' | 'meilleur';

interface WeakAxisView {
  axis: AxisType;
  presentation: AxisPresentation;
  tag: string;
  tagColorVar: string;
  bestScore: number;
  slug: string;
  durationMinutes: number;
}

interface LastResultView {
  sessionId: string;
  scoreLabel: string;
  stamp: SimulationStamp;
  score: number;
  threshold: number;
  deltaLabel: string;
  deltaAbove: boolean;
  dateLabel: string;
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AxisIcon,
    BadgeFeedBanner,
    AxisLabel,
    AxisRadar,
    Button,
    ChevronStepper,
    CountUp,
    Icon,
    MotionOnce,
    RouterLink,
    SectorChip,
    Skeleton,
    StampBadge,
    ThresholdBar,
  ],
  providers: [ProgressionFacade, TrainingsOverviewFacade],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly authFacade = inject(AuthFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly overviewFacade = inject(TrainingsOverviewFacade);
  private readonly progressionFacade = inject(ProgressionFacade);
  private readonly sessionHistoryFacade = inject(SessionHistoryFacade);
  private readonly router = inject(Router);
  private readonly clock = inject(Clock);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly badgeStatusesResource = httpResource<BadgeStatusDto[] | null>(
    () => `${this.baseUrl}/me/badges`,
    { defaultValue: null },
  );
  private readonly now = new Date();

  protected readonly playIcon = Play;
  protected readonly arrowIcon = ArrowRight;
  protected readonly discoverIcon = Target;
  protected readonly chevronIcon = ChevronRight;
  protected readonly statuses = AxisProgressStatus;
  protected readonly fullSessionLabel = FULL_SESSION_LABEL;
  protected readonly cardIconSize = AXIS_ICON_SIZE.card;

  protected readonly radarMode = signal<RadarMode>('derniere');

  constructor() {
    this.overviewFacade.load(this.sector());
    this.sessionHistoryFacade.refreshCurrent();
  }

  protected readonly overviewLoaded = computed(
    () => this.overviewFacade.overview() !== null,
  );

  protected readonly overviewError = computed(
    () =>
      this.overviewFacade.error() !== undefined &&
      this.overviewFacade.error() !== null,
  );

  protected readonly overviewPending = computed(
    () => !this.overviewLoaded() && !this.overviewError(),
  );

  protected retryOverview(): void {
    this.overviewFacade.reload();
  }

  private readonly overview = this.overviewFacade.overview;
  private readonly current = this.sessionHistoryFacade.current;
  private readonly energy = this.energyFacade.state;

  protected readonly sector = computed(
    () => this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY,
  );

  protected readonly sectorPresentation = computed(
    () => SECTOR_PRESENTATION[this.sector()],
  );

  protected readonly isNew = computed(() => {
    const overview = this.overview();
    return (
      overview !== null &&
      overview.lastSimulation === null &&
      overview.axes.every((axis) => axis.neverPlayed) &&
      this.current() === null
    );
  });

  protected readonly variant = computed<DayVariant>(() =>
    this.current() !== null ? 'session' : this.isNew() ? 'new' : 'train',
  );

  private readonly balance = computed(() => this.energy()?.balance ?? 0);

  protected readonly greeting = computed(() => {
    const firstName = this.authFacade.currentUser()?.firstName ?? '';
    const hour = this.clock.now().getHours();
    const salutation = hour >= 5 && hour < 18 ? 'Bonjour' : 'Bonsoir';
    return `${this.isNew() ? 'Bienvenue' : salutation} ${firstName}`.trim();
  });

  protected readonly subtitle = computed(() => {
    if (this.isNew()) {
      return 'Votre compte est prêt. Lancez votre première session pour établir votre profil sur les axes de votre secteur.';
    }
    if (this.variant() === 'session') {
      return `Vous avez un ${FULL_SESSION_LABEL.toLowerCase()} en cours : reprenez là où vous vous êtes arrêté.`;
    }
    return 'Chaque session vous rapproche de la sélection.';
  });

  protected readonly balanceValue = computed(() => this.balance());

  protected readonly lowCreditsNote = computed<string | null>(() => {
    const balance = this.balance();
    if (balance === 1) {
      return 'Il vous reste de quoi lancer une session ciblée.';
    }
    return null;
  });

  protected readonly earnableRemainder = computed<number | null>(() => {
    const statuses = this.badgeStatusesResource.value();
    if (!statuses) {
      return null;
    }
    const earnedIds = new Set(
      statuses
        .filter((status) => status.earnedAt !== null)
        .map((status) => status.badgeId),
    );
    const remainder = [...BADGE_BY_ID.values()]
      .filter((definition) => !earnedIds.has(definition.id))
      .reduce((sum, definition) => sum + definition.energyReward, 0);
    return remainder > 0 ? remainder : null;
  });

  protected readonly energyLabel = computed(() =>
    this.balance() === 0 ? 'Crédits épuisés' : 'Crédits disponibles',
  );

  protected readonly energyValue = computed(() => {
    const energy = this.energy();
    return energy ? `${energy.balance}` : null;
  });

  protected readonly trainSub = computed<string | null>(() => {
    const balance = this.balance();
    if (balance >= SESSION_ENERGY_COST[SessionMode.FULL]) {
      return 'Vous avez de quoi lancer un examen blanc complet.';
    }
    if (balance > 0) {
      return `Il vous reste ${balance} crédit${balance > 1 ? 's' : ''}. Une séance suffit pour progresser, même courte.`;
    }
    return null;
  });

  protected readonly sessionIsFull = computed(
    () => this.current()?.mode === SessionMode.FULL,
  );

  protected readonly sessionSteps = computed<ChevronStep[]>(() => {
    const session = this.current();
    if (!session || session.mode !== SessionMode.FULL) {
      return [];
    }
    return session.axes.map((axis) => ({
      axis: axis.axis,
      state:
        axis.status === AxisProgressStatus.DONE
          ? 'done'
          : axis.status === AxisProgressStatus.CURRENT
            ? 'current'
            : 'todo',
    }));
  });

  protected readonly targetedAxis = computed(() => {
    const session = this.current();
    return session && session.mode === SessionMode.TARGETED
      ? (session.axes[0]?.axis ?? null)
      : null;
  });

  protected readonly lastResult = computed<LastResultView | null>(() => {
    const simulation = this.overview()?.lastSimulation ?? null;
    if (!simulation) {
      return null;
    }
    const delta =
      Math.round((simulation.globalScore - simulation.sectorThreshold) * 10) /
      10;
    const deltaValue = formatFrenchDecimal(Math.abs(delta));
    return {
      sessionId: simulation.sessionId,
      scoreLabel: formatFrenchDecimal(simulation.globalScore),
      stamp: buildSimulationStamp(
        simulation.globalScore,
        simulation.sectorThreshold,
        simulation.isEliminated,
      ),
      score: simulation.globalScore,
      threshold: simulation.sectorThreshold,
      deltaLabel:
        delta >= 0
          ? `+${deltaValue} au-dessus`
          : `−${deltaValue} sous le seuil`,
      deltaAbove: delta >= 0,
      dateLabel: formatSessionDate(simulation.completedAt, this.now),
    };
  });

  protected readonly radarEntries = computed<AxisRadarEntry[]>(() => {
    if (this.radarMode() === 'meilleur') {
      const axes = this.overview()?.axes ?? [];
      return FULL_SESSION_AXIS_ORDER.map((axis) => ({
        axis,
        score: axes.find((entry) => entry.axis === axis)?.bestScore ?? 0,
      }));
    }
    const last = this.progressionFacade.progression()?.radar.last ?? [];
    return FULL_SESSION_AXIS_ORDER.map((axis) => ({
      axis,
      score: last.find((entry) => entry.axis === axis)?.score ?? 0,
    }));
  });

  protected readonly radarCaption = computed(() => {
    if (this.radarMode() === 'meilleur') {
      return 'Meilleurs scores, tous entraînements confondus';
    }
    const completedAt = this.overview()?.lastSimulation?.completedAt;
    return completedAt
      ? `Dernière session · ${formatSessionDate(completedAt, this.now)}`
      : 'Dernière session';
  });

  protected readonly weakAxis = computed<WeakAxisView | null>(() => {
    const played = (this.overview()?.axes ?? []).filter(
      (axis) => axis.bestScore !== null,
    );
    if (played.length === 0) {
      return null;
    }
    const weakest = [...played].sort(
      (a, b) => (a.bestScore ?? 0) - (b.bestScore ?? 0),
    )[0];
    const presentation = AXIS_PRESENTATION[weakest.axis];
    return {
      axis: weakest.axis,
      presentation,
      tag: weakest.isCriticalAxis
        ? `Axe critique du ${this.sectorPresentation().label.toLowerCase()}`
        : 'Votre score le plus bas',
      tagColorVar: weakest.isCriticalAxis
        ? presentation.textVar
        : 'var(--label)',
      bestScore: Math.round(weakest.bestScore ?? 0),
      slug: axisSlug(weakest.axis),
      durationMinutes: Math.ceil(
        axisMaxDurationSec(weakest.axis as RailwayPlayableAxis) / 60,
      ),
    };
  });

  protected setRadarMode(mode: RadarMode): void {
    this.radarMode.set(mode);
  }

  protected resume(): void {
    const session = this.current();
    if (!session) {
      return;
    }
    if (session.mode === SessionMode.FULL) {
      this.router.navigate(['/entrainements/examen-blanc/session', session.id]);
      return;
    }
    if (session.axes.length > 0) {
      this.router.navigate([
        '/entrainements/cible',
        axisSlug(session.axes[0].axis),
        'session',
        session.id,
      ]);
      return;
    }
    this.router.navigate(['/entrainements']);
  }

  protected train(): void {
    this.router.navigate(['/entrainements']);
  }

  protected openLastResult(): void {
    const sessionId = this.lastResult()?.sessionId;
    if (sessionId) {
      this.router.navigate(['/sessions', sessionId, 'resultat']);
    }
  }

  protected openProgression(): void {
    this.router.navigate(['/progression']);
  }


  protected workWeakAxis(): void {
    const slug = this.weakAxis()?.slug;
    if (slug) {
      this.router.navigate(['/entrainements/cible', slug]);
    }
  }
}
