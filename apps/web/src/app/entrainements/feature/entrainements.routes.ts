import { CanMatchFn, Route, UrlSegment } from '@angular/router';
import { AxisType, FULL_SESSION_LABEL } from '@psychotech/shared';
import { AXIS_SLUGS } from '../../shared/util/axis-slug';
import {
  tutorialPlayResetGuard,
  provideTutorialSession,
} from '../data-access/tutorial-session.facade';
import { confirmPlayLeaveGuard } from './play-leave.guard';

function createAxisSlugMatcher(axis: AxisType): CanMatchFn {
  return (_route: Route, segments: UrlSegment[]) =>
    segments[2]?.path === AXIS_SLUGS[axis];
}

function createSimulationAxisMatcher(axis: AxisType): CanMatchFn {
  return (_route: Route, segments: UrlSegment[]) =>
    segments[5]?.path === AXIS_SLUGS[axis];
}

const LEGACY_FULL_SESSION_REDIRECTS: Route[] = [
  {
    path: 'entrainements/simulation',
    pathMatch: 'full',
    redirectTo: 'entrainements/examen-blanc',
  },
  {
    path: 'entrainements/simulation/session/:sessionId',
    pathMatch: 'full',
    redirectTo: 'entrainements/examen-blanc/session/:sessionId',
  },
  {
    path: 'entrainements/simulation/session/:sessionId/axe/:axis',
    redirectTo: 'entrainements/examen-blanc/session/:sessionId/axe/:axis',
  },
  {
    path: 'entrainements/simulation/session/:sessionId/correction/:axis',
    redirectTo:
      'entrainements/examen-blanc/session/:sessionId/correction/:axis',
  },
];

const simulationBriefingHeader = {
  stepper: true,
  live: false,
  showEnergy: false,
  showTimer: false,
  closeLink: '/entrainements',
};

const simulationPlayHeader = {
  stepper: true,
  showEnergy: false,
  closeLink: '/entrainements',
};

const tutorialPlayHeader = {
  title: '',
  discoveryTag: true,
  backLabel: 'Entraînements',
  backLink: '/entrainements',
  closeLink: '/entrainements',
  axisParam: 'axis',
  axisChip: true,
  showEnergy: false,
  showTimer: false,
  live: false,
};

const correctionHeader = {
  title: 'Correction',
  backLabel: 'Résultat',
  backLink: '/entrainements/cible/:axis/session/:sessionId/resultat',
  closeLink: '/entrainements/cible/:axis/session/:sessionId/resultat',
  axisParam: 'axis',
  axisChip: true,
  mobileTitle: true,
  showEnergy: false,
  showTimer: false,
  live: false,
};

const simulationCorrectionHeader = {
  title: 'Correction',
  backLabel: 'Bilan',
  backLink: '/sessions/:sessionId/resultat',
  closeLink: '/sessions/:sessionId/resultat',
  axisParam: 'axis',
  axisChip: true,
  mobileTitle: true,
  showEnergy: false,
  showTimer: false,
  live: false,
};

export const entrainementsRoutes: Route[] = [
  {
    path: 'entrainements',
    loadComponent: () =>
      import('./entrainements/entrainements').then((m) => m.Entrainements),
  },
  {
    path: 'entrainements/tutoriel/:axis',
    data: {
      tutorial: true,
      focusedHeader: {
        discoveryTag: true,
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        axisParam: 'axis',
        showTimer: false,
        showEnergy: false,
        live: false,
      },
    },
    providers: provideTutorialSession(),
    loadComponent: () =>
      import('./axis-start/axis-start').then((m) => m.AxisStart),
  },
  {
    path: 'entrainements/tutoriel/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.LOGIC)],
    canActivate: [tutorialPlayResetGuard],
    data: { tutorial: true, focusedHeader: tutorialPlayHeader },
    providers: provideTutorialSession(AxisType.LOGIC),
    loadComponent: () =>
      import('./logic-play/logic-play').then((m) => m.LogicPlay),
  },
  {
    path: 'entrainements/tutoriel/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.MEMORY)],
    canActivate: [tutorialPlayResetGuard],
    data: { tutorial: true, focusedHeader: tutorialPlayHeader },
    providers: provideTutorialSession(AxisType.MEMORY),
    loadComponent: () =>
      import('./memory-play/memory-play').then((m) => m.MemoryPlay),
  },
  {
    path: 'entrainements/tutoriel/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.VISUAL_DISCRIMINATION)],
    canActivate: [tutorialPlayResetGuard],
    data: { tutorial: true, focusedHeader: tutorialPlayHeader },
    providers: provideTutorialSession(AxisType.VISUAL_DISCRIMINATION),
    loadComponent: () =>
      import('./discrimination-play/discrimination-play').then(
        (m) => m.DiscriminationPlay,
      ),
  },
  {
    path: 'entrainements/tutoriel/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.REACTIVITY)],
    canActivate: [tutorialPlayResetGuard],
    data: { tutorial: true, focusedHeader: tutorialPlayHeader },
    providers: provideTutorialSession(AxisType.REACTIVITY),
    loadComponent: () =>
      import('./reactivity-play/reactivity-play').then((m) => m.ReactivityPlay),
  },
  {
    path: 'entrainements/tutoriel/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.MOTOR_SKILLS)],
    canActivate: [tutorialPlayResetGuard],
    data: { tutorial: true, focusedHeader: tutorialPlayHeader },
    providers: provideTutorialSession(AxisType.MOTOR_SKILLS),
    loadComponent: () =>
      import('./motricity-play/motricity-play').then((m) => m.MotricityPlay),
  },
  {
    path: 'entrainements/tutoriel/:axis/fin',
    data: {
      tutorial: true,
      focusedHeader: {
        title: '',
        discoveryTag: true,
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        showTimer: false,
        showEnergy: false,
        live: false,
      },
    },
    loadComponent: () =>
      import('./tutorial-end/tutorial-end').then((m) => m.TutorialEnd),
  },
  {
    path: 'entrainements/examen-blanc',
    data: {
      focusedHeader: {
        title: FULL_SESSION_LABEL,
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        energyCost: 5,
      },
    },
    loadComponent: () =>
      import('./simulation-start/simulation-start').then(
        (m) => m.SimulationStart,
      ),
  },
  {
    path: 'entrainements/examen-blanc/session/:sessionId',
    data: { focusedHeader: simulationBriefingHeader },
    loadComponent: () =>
      import('./simulation-briefing/simulation-briefing').then(
        (m) => m.SimulationBriefing,
      ),
  },
  {
    path: 'entrainements/examen-blanc/session/:sessionId/axe/:axis',
    canMatch: [createSimulationAxisMatcher(AxisType.LOGIC)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./logic-play/logic-play').then((m) => m.LogicPlay),
  },
  {
    path: 'entrainements/examen-blanc/session/:sessionId/axe/:axis',
    canMatch: [createSimulationAxisMatcher(AxisType.MEMORY)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./memory-play/memory-play').then((m) => m.MemoryPlay),
  },
  {
    path: 'entrainements/examen-blanc/session/:sessionId/axe/:axis',
    canMatch: [createSimulationAxisMatcher(AxisType.VISUAL_DISCRIMINATION)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./discrimination-play/discrimination-play').then(
        (m) => m.DiscriminationPlay,
      ),
  },
  {
    path: 'entrainements/examen-blanc/session/:sessionId/axe/:axis',
    canMatch: [createSimulationAxisMatcher(AxisType.REACTIVITY)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./reactivity-play/reactivity-play').then((m) => m.ReactivityPlay),
  },
  {
    path: 'entrainements/examen-blanc/session/:sessionId/axe/:axis',
    canMatch: [createSimulationAxisMatcher(AxisType.MOTOR_SKILLS)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./motricity-play/motricity-play').then((m) => m.MotricityPlay),
  },
  {
    path: 'entrainements/examen-blanc/session/:sessionId/correction/:axis',
    canMatch: [createSimulationAxisMatcher(AxisType.LOGIC)],
    data: { simulation: true, focusedHeader: simulationCorrectionHeader },
    loadComponent: () =>
      import('./logic-correction/logic-correction').then(
        (m) => m.LogicCorrection,
      ),
  },
  {
    path: 'entrainements/examen-blanc/session/:sessionId/correction/:axis',
    canMatch: [createSimulationAxisMatcher(AxisType.MEMORY)],
    data: { simulation: true, focusedHeader: simulationCorrectionHeader },
    loadComponent: () =>
      import('./memory-correction/memory-correction').then(
        (m) => m.MemoryCorrection,
      ),
  },
  {
    path: 'entrainements/cible/:axis',
    data: {
      focusedHeader: {
        backLabel: 'Entraînement ciblé',
        backLink: '/entrainements',
        backQueryParams: { panel: 'cible' },
        axisParam: 'axis',
        showTimer: false,
        energyCost: 1,
      },
    },
    loadComponent: () =>
      import('./axis-start/axis-start').then((m) => m.AxisStart),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.LOGIC)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
      },
    },
    loadComponent: () =>
      import('./logic-play/logic-play').then((m) => m.LogicPlay),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/resultat',
    canMatch: [createAxisSlugMatcher(AxisType.LOGIC)],
    data: {
      mobileFlow: { axisParam: 'axis', suffix: 'Ciblé' },
    },
    loadComponent: () =>
      import('./logic-result/logic-result').then((m) => m.LogicResult),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/correction',
    canMatch: [createAxisSlugMatcher(AxisType.LOGIC)],
    data: { focusedHeader: correctionHeader },
    loadComponent: () =>
      import('./logic-correction/logic-correction').then(
        (m) => m.LogicCorrection,
      ),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/resultat',
    canMatch: [createAxisSlugMatcher(AxisType.MEMORY)],
    data: {
      mobileFlow: { axisParam: 'axis', suffix: 'Ciblé' },
    },
    loadComponent: () =>
      import('./memory-result/memory-result').then((m) => m.MemoryResult),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/correction',
    canMatch: [createAxisSlugMatcher(AxisType.MEMORY)],
    data: { focusedHeader: correctionHeader },
    loadComponent: () =>
      import('./memory-correction/memory-correction').then(
        (m) => m.MemoryCorrection,
      ),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/resultat',
    canMatch: [createAxisSlugMatcher(AxisType.VISUAL_DISCRIMINATION)],
    data: {
      mobileFlow: { axisParam: 'axis', suffix: 'Ciblé' },
    },
    loadComponent: () =>
      import('./discrimination-result/discrimination-result').then(
        (m) => m.DiscriminationResult,
      ),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/resultat',
    canMatch: [createAxisSlugMatcher(AxisType.REACTIVITY)],
    data: {
      mobileFlow: { axisParam: 'axis', suffix: 'Ciblé' },
    },
    loadComponent: () =>
      import('./reactivity-result/reactivity-result').then(
        (m) => m.ReactivityResult,
      ),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/resultat',
    canMatch: [createAxisSlugMatcher(AxisType.MOTOR_SKILLS)],
    data: {
      mobileFlow: { axisParam: 'axis', suffix: 'Ciblé' },
    },
    loadComponent: () =>
      import('./motricity-result/motricity-result').then(
        (m) => m.MotricityResult,
      ),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.MEMORY)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
      },
    },
    loadComponent: () =>
      import('./memory-play/memory-play').then((m) => m.MemoryPlay),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.REACTIVITY)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
      },
    },
    loadComponent: () =>
      import('./reactivity-play/reactivity-play').then((m) => m.ReactivityPlay),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.MOTOR_SKILLS)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
      },
    },
    loadComponent: () =>
      import('./motricity-play/motricity-play').then((m) => m.MotricityPlay),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId',
    canMatch: [createAxisSlugMatcher(AxisType.VISUAL_DISCRIMINATION)],
    canDeactivate: [confirmPlayLeaveGuard],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
      },
    },
    loadComponent: () =>
      import('./discrimination-play/discrimination-play').then(
        (m) => m.DiscriminationPlay,
      ),
  },
  ...LEGACY_FULL_SESSION_REDIRECTS,
];
