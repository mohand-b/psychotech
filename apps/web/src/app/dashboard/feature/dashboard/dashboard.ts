import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  AxisProgressStatus,
  AxisType,
  FULL_SESSION_AXIS_ORDER,
  Sector,
  SessionMode,
  SubscriptionTier,
} from '@psychotech/shared';
import { ArrowRight, Check, Gem, Play, Target } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CoreFacade } from '../../../core/data-access/core.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { TrainingsOverviewFacade } from '../../../entrainements/data-access/trainings-overview.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { SessionHistoryFacade } from '../../../sessions/data-access/session-history.facade';
import {
  AxisRadar,
  AxisRadarEntry,
} from '../../../sessions/ui/axis-radar/axis-radar';
import {
  AXIS_PRESENTATION,
  AxisPresentation,
} from '../../../shared/ui/axis-presentation';
import { BoltIcon } from '../../../shared/ui/bolt-icon/bolt-icon';
import { Icon } from '../../../shared/ui/icon/icon';
import {
  BAND_COLOR_VARS,
  BAND_LABELS,
} from '../../../shared/ui/score-rating';
import { SECTOR_PRESENTATION } from '../../../shared/ui/sector-presentation';
import { SectorChip } from '../../../shared/ui/sector-chip/sector-chip';
import { ThresholdBar } from '../../../shared/ui/threshold-bar/threshold-bar';
import { axisSlug } from '../../../shared/util/axis-slug';
import { formatSessionDate } from '../../../shared/util/format-session-date';

type DayVariant = 'session' | 'train' | 'new';
type RadarMode = 'derniere' | 'meilleur';

interface SessionChipView {
  presentation: AxisPresentation;
  status: AxisProgressStatus;
}

interface WeakAxisView {
  presentation: AxisPresentation;
  tag: string;
  tagColorVar: string;
  bestScore: number;
  slug: string;
}

interface LastResultView {
  sessionId: string;
  scoreLabel: string;
  bandLabel: string;
  bandColorVar: string;
  score: number;
  threshold: number;
  deltaLabel: string;
  deltaAbove: boolean;
  dateLabel: string;
}

function formatScore(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

@Component({
  selector: 'app-dashboard',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisRadar, BoltIcon, Icon, SectorChip, ThresholdBar],
  providers: [ProgressionFacade, TrainingsOverviewFacade],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly authFacade = inject(AuthFacade);
  private readonly coreFacade = inject(CoreFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly overviewFacade = inject(TrainingsOverviewFacade);
  private readonly progressionFacade = inject(ProgressionFacade);
  private readonly sessionHistoryFacade = inject(SessionHistoryFacade);
  private readonly router = inject(Router);
  private readonly now = new Date();

  protected readonly playIcon = Play;
  protected readonly arrowIcon = ArrowRight;
  protected readonly checkIcon = Check;
  protected readonly planIcon = Gem;
  protected readonly discoverIcon = Target;
  protected readonly statuses = AxisProgressStatus;
  protected readonly tiers = SubscriptionTier;

  protected readonly radarMode = signal<RadarMode>('derniere');

  constructor() {
    this.overviewFacade.load(this.sector());
    this.sessionHistoryFacade.refreshCurrent();
  }

  protected readonly tier = this.coreFacade.tier;
  protected readonly overviewLoaded = computed(
    () => this.overviewFacade.overview() !== null,
  );

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

  private readonly unlimited = computed(
    () => this.tier() === SubscriptionTier.UNLIMITED,
  );
  private readonly free = computed(() => this.tier() === SubscriptionTier.FREE);
  private readonly balance = computed(() => this.energy()?.balance ?? 0);
  private readonly fullEnergy = computed(() => {
    const energy = this.energy();
    return energy !== null && energy.balance >= energy.capacity;
  });

  protected readonly greeting = computed(() => {
    const firstName = this.authFacade.currentUser()?.firstName ?? '';
    return `${this.isNew() ? 'Bienvenue' : 'Bonjour'} ${firstName}`.trim();
  });

  protected readonly subtitle = computed(() => {
    if (this.isNew()) {
      return 'Votre compte est prêt. Lancez votre première session pour établir votre profil sur les axes de votre secteur.';
    }
    if (this.variant() === 'session') {
      return 'Vous avez une simulation en cours : reprenez là où vous vous êtes arrêté.';
    }
    if (this.free()) {
      return 'Découvrez les épreuves avec les tutoriels en libre accès.';
    }
    if (this.unlimited()) {
      return 'Énergie illimitée : simulation complète ou axe ciblé, à vous de choisir.';
    }
    return this.fullEnergy()
      ? 'Votre énergie est pleine : simulation complète ou axe ciblé, à vous de choisir.'
      : 'Simulation complète ou axe ciblé : à vous de choisir.';
  });

  protected readonly energyLabel = computed(() => {
    if (this.free()) {
      return 'Tutoriels en libre accès';
    }
    if (this.unlimited()) {
      return 'Énergie illimitée';
    }
    if (this.fullEnergy()) {
      return 'Énergie pleine';
    }
    return this.balance() === 0 ? 'Énergie épuisée' : 'Énergie restante';
  });

  protected readonly energyValue = computed(() => {
    if (this.free()) {
      return null;
    }
    if (this.unlimited()) {
      return '∞';
    }
    const energy = this.energy();
    return energy ? `${energy.balance}/${energy.capacity}` : null;
  });

  protected readonly trainSub = computed(() => {
    if (this.free()) {
      return 'Les tutoriels de chaque axe sont en libre accès pour découvrir les épreuves.';
    }
    if (this.unlimited()) {
      return 'Votre énergie est illimitée : enchaînez les séances autant que vous le souhaitez.';
    }
    if (this.fullEnergy()) {
      return 'Votre énergie du jour est pleine. Une séance suffit pour progresser, même courte.';
    }
    if (this.balance() === 0) {
      return 'Votre énergie du jour est épuisée. Elle se recharge à minuit ; les tutoriels restent en libre accès.';
    }
    const balance = this.balance();
    return `Il vous reste ${balance} énergie${balance > 1 ? 's' : ''} aujourd'hui. Une séance suffit pour progresser, même courte.`;
  });

  protected readonly sessionIsFull = computed(
    () => this.current()?.mode === SessionMode.FULL,
  );

  protected readonly sessionChips = computed<SessionChipView[]>(() => {
    const session = this.current();
    if (!session || session.mode !== SessionMode.FULL) {
      return [];
    }
    return session.axes.map((axis) => ({
      presentation: AXIS_PRESENTATION[axis.axis],
      status: axis.status,
    }));
  });

  protected readonly sessionDoneCount = computed(
    () =>
      this.current()?.axes.filter(
        (axis) => axis.status === AxisProgressStatus.DONE,
      ).length ?? 0,
  );

  protected readonly sessionAxisTotal = computed(
    () => this.current()?.axes.length ?? 0,
  );

  protected readonly sessionNextLabel = computed(() => {
    const axes = this.current()?.axes ?? [];
    const next =
      axes.find((axis) => axis.status === AxisProgressStatus.CURRENT) ??
      axes.find((axis) => axis.status === AxisProgressStatus.PENDING);
    return next ? AXIS_PRESENTATION[next.axis].label : null;
  });

  protected readonly targetedPresentation = computed(() => {
    const session = this.current();
    return session && session.mode === SessionMode.TARGETED
      ? (AXIS_PRESENTATION[session.axes[0]?.axis] ?? null)
      : null;
  });

  protected readonly planName = computed(() => {
    const tier = this.tier();
    return tier === SubscriptionTier.FREE
      ? 'Découverte'
      : tier === SubscriptionTier.UNLIMITED
        ? 'Illimité'
        : 'Essentiel';
  });

  protected readonly planDesc = computed(() => {
    const tier = this.tier();
    return tier === SubscriptionTier.FREE
      ? 'Tutoriels de chaque axe, en libre accès'
      : tier === SubscriptionTier.UNLIMITED
        ? 'Énergie illimitée, sans quota journalier'
        : '5 énergies par jour, rechargées à minuit';
  });

  protected readonly canUpgrade = computed(
    () => this.tier() === SubscriptionTier.ESSENTIAL,
  );

  protected readonly lastResult = computed<LastResultView | null>(() => {
    const simulation = this.overview()?.lastSimulation ?? null;
    if (!simulation) {
      return null;
    }
    const delta =
      Math.round((simulation.globalScore - simulation.sectorThreshold) * 10) /
      10;
    const deltaValue = formatScore(Math.abs(delta));
    return {
      sessionId: simulation.sessionId,
      scoreLabel: formatScore(simulation.globalScore),
      bandLabel: BAND_LABELS[simulation.globalBand],
      bandColorVar: BAND_COLOR_VARS[simulation.globalBand],
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
      presentation,
      tag: weakest.isCriticalAxis
        ? `Axe critique du ${this.sectorPresentation().label.toLowerCase()}`
        : 'Votre score le plus bas',
      tagColorVar: weakest.isCriticalAxis
        ? presentation.textVar
        : 'var(--label)',
      bestScore: Math.round(weakest.bestScore ?? 0),
      slug: axisSlug(weakest.axis),
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
      this.router.navigate(['/entrainements/simulation/session', session.id]);
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

  protected openOffers(): void {
    this.router.navigate(['/offres']);
  }

  protected workWeakAxis(): void {
    const slug = this.weakAxis()?.slug;
    if (slug) {
      this.router.navigate(['/entrainements/cible', slug]);
    }
  }

  protected chipColor(chip: SessionChipView): string {
    return chip.status === AxisProgressStatus.PENDING
      ? '#9AA3B2'
      : chip.presentation.textVar;
  }

  protected chipBackground(chip: SessionChipView): string {
    return chip.status === AxisProgressStatus.PENDING
      ? 'var(--surface-muted)'
      : chip.presentation.pastelVar;
  }
}
