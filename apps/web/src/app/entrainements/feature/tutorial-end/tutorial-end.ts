import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  AXIS_TUTORIAL,
  AxisType,
  MOTRICITY_TUTORIAL_START_WIDTH,
  SECTOR_LABELS,
  Sector,
  TUTORIAL_SEED,
  generateDiscriminationSession,
  generateLogicTutorial,
  generateMemorySession,
  generateMotricityCourses,
  generateReactivitySession,
  scoreDiscriminationSession,
  scoreLogicSession,
  scoreMemorySession,
  scoreMotricityCourse,
  scoreReactivitySession,
  tutorialSeedFor,
} from '@psychotech/shared';
import { ArrowRight, Check } from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { AxisLabel } from '../../../shared/ui/axis-label/axis-label';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { axisFromSlug, axisSlug } from '../../../shared/util/axis-slug';
import { ButtonColor } from '../../../shared/ui/button/button';
import { axisButtonColor } from '../../../shared/ui/axis-button-color';
import { BadgesFacade } from '../../../badges/data-access/badges.facade';
import { TutorialRunFacade } from '../../data-access/tutorial-run.facade';
import { TutorialRunResult } from '../../data-access/tutorial-run.store';
import { formatOverviewDate } from '../entrainements/trainings-overview-view';

interface TutorialMetricRow {
  label: string;
  main: string;
  unit: string;
}

const FULL_EVALUATION_POINTS = [
  "L'épreuve entière, notée sur 100",
  'Des exercices renouvelés à chaque session',
  'Métriques détaillées, graphiques et recommandations',
  "Suivi de progression et avis d'admissibilité",
];

function formatSeconds(ms: number | null): string {
  return ms === null ? '-' : (ms / 1000).toFixed(1).replace('.', ',');
}

function tutorialMetricRows(result: TutorialRunResult): TutorialMetricRow[] {
  switch (result.axis) {
    case AxisType.LOGIC: {
      const scored = scoreLogicSession(
        generateLogicTutorial(TUTORIAL_SEED),
        result.items,
      );
      return [
        {
          label: 'Bonnes réponses',
          main: `${scored.correctCount}`,
          unit: `/${result.items.length}`,
        },
        {
          label: 'Temps moyen par item',
          main: formatSeconds(scored.avgAnswerTimeMs),
          unit: ' s',
        },
      ];
    }
    case AxisType.MEMORY: {
      const scored = scoreMemorySession(
        generateMemorySession(TUTORIAL_SEED, AXIS_TUTORIAL[AxisType.MEMORY]),
        result.sequences,
      );
      return [
        {
          label: 'Séquence restituée sans faute',
          main: scored.perfectCount > 0 ? 'Oui' : 'Non',
          unit: '',
        },
        {
          label: 'Chiffres bien placés',
          main: `${Math.round(scored.placedPct)}`,
          unit: ' %',
        },
      ];
    }
    case AxisType.VISUAL_DISCRIMINATION: {
      const scored = scoreDiscriminationSession(
        generateDiscriminationSession(
          TUTORIAL_SEED,
          AXIS_TUTORIAL[AxisType.VISUAL_DISCRIMINATION],
        ),
        result.trials,
      );
      return [
        {
          label: 'Essais corrects',
          main: `${scored.correctCount}`,
          unit: `/${result.trials.length}`,
        },
        {
          label: 'Temps moyen par essai',
          main: formatSeconds(scored.avgAnswerTimeMs),
          unit: ' s',
        },
      ];
    }
    case AxisType.REACTIVITY: {
      const scored = scoreReactivitySession(
        generateReactivitySession(
          TUTORIAL_SEED,
          AXIS_TUTORIAL[AxisType.REACTIVITY],
        ),
        result.stimuli,
        result.waitPresses,
      );
      return [
        {
          label: 'Temps de réaction moyen',
          main: scored.trMoyMs === null ? '-' : `${Math.round(scored.trMoyMs)}`,
          unit: ' ms',
        },
        {
          label: 'Erreurs de commande',
          main: `${scored.wrongCommandCount}`,
          unit: '',
        },
        { label: 'Signaux manqués', main: `${scored.omissionCount}`, unit: '' },
      ];
    }
    case AxisType.MOTOR_SKILLS: {
      const course = generateMotricityCourses(
        tutorialSeedFor(AxisType.MOTOR_SKILLS),
        {
          courseCount: 1,
          startWidths: [MOTRICITY_TUTORIAL_START_WIDTH],
        },
      )[0];
      const scored = scoreMotricityCourse(
        course,
        result.courses[0]?.samples ?? [],
      );
      return [
        {
          label: 'Parcours complété',
          main: `${Math.round(scored.progressionPct)}`,
          unit: ' %',
        },
        {
          label: 'Erreurs',
          main: `${scored.minorErrors + scored.majorErrors}`,
          unit: '',
        },
      ];
    }
  }
}

@Component({
  selector: 'app-tutorial-end',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisLabel, Button, Icon, RouterLink],
  templateUrl: './tutorial-end.html',
  styleUrl: './tutorial-end.css',
})
export class TutorialEnd {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly runFacade = inject(TutorialRunFacade);
  private readonly authFacade = inject(AuthFacade);
  private readonly badgesFacade = inject(BadgesFacade);

  protected readonly arrowIcon = ArrowRight;
  protected readonly checkIcon = Check;
  protected readonly evaluationPoints = FULL_EVALUATION_POINTS;

  protected readonly axis = axisFromSlug(
    this.route.snapshot.paramMap.get('axis'),
  );

  protected readonly sectorLabel =
    SECTOR_LABELS[
      this.authFacade.currentUser()?.currentSector ?? Sector.RAILWAY
    ];

  protected readonly dateLabel = formatOverviewDate(
    new Date().toISOString(),
    new Date(),
  );

  protected readonly targetedLink = this.axis
    ? ['/entrainements/cible', axisSlug(this.axis)]
    : ['/entrainements'];

  protected readonly primaryLabel = 'Entraînement ciblé';

  protected readonly primaryLink = this.targetedLink;

  protected readonly primaryColor: ButtonColor =
    this.axis === null ? 'brand' : axisButtonColor(this.axis);

  protected readonly metricRows = computed<TutorialMetricRow[]>(() => {
    const result = this.runFacade.result();
    return result && result.axis === this.axis
      ? tutorialMetricRows(result)
      : [];
  });

  constructor() {
    const result = this.runFacade.result();
    if (this.axis === null || result === null || result.axis !== this.axis) {
      this.router.navigate(
        this.axis
          ? ['/entrainements/tutoriel', axisSlug(this.axis)]
          : ['/entrainements'],
      );
      return;
    }
    this.badgesFacade.notifyTutorialDiscovered();
  }
}
