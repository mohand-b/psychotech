import { CanMatchFn, Route, UrlSegment } from '@angular/router';
import { AxisType } from '@psychotech/shared';
import { AXIS_SLUGS } from '../../shared/util/axis-slug';

function axisSessionMatcher(axis: AxisType): CanMatchFn {
  return (_route: Route, segments: UrlSegment[]) =>
    segments[2]?.path === AXIS_SLUGS[axis];
}

function simulationAxisMatcher(axis: AxisType): CanMatchFn {
  return (_route: Route, segments: UrlSegment[]) =>
    segments[5]?.path === AXIS_SLUGS[axis];
}

const simulationBriefingHeader = {
  stepper: true,
  live: false,
  showEnergy: false,
  closeLink: '/entrainements',
};

const simulationPlayHeader = {
  stepper: true,
  showEnergy: false,
  closeLink: '/entrainements',
};

export const entrainementsRoutes: Route[] = [
  {
    path: 'entrainements',
    loadComponent: () =>
      import('./entrainements/entrainements').then((m) => m.Entrainements),
  },
  {
    path: 'entrainements/choisir-axe',
    loadComponent: () =>
      import('./axis-selection/axis-selection').then((m) => m.AxisSelection),
  },
  {
    path: 'entrainements/simulation',
    data: {
      focusedHeader: {
        title: 'Simulation complète',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        brandChip: true,
      },
    },
    loadComponent: () =>
      import('./simulation-start/simulation-start').then(
        (m) => m.SimulationStart,
      ),
  },
  {
    path: 'entrainements/simulation/session/:sessionId',
    data: { focusedHeader: simulationBriefingHeader },
    loadComponent: () =>
      import('./simulation-briefing/simulation-briefing').then(
        (m) => m.SimulationBriefing,
      ),
  },
  {
    path: 'entrainements/simulation/session/:sessionId/axe/:axis',
    canMatch: [simulationAxisMatcher(AxisType.LOGIC)],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./logic-play/logic-play').then((m) => m.LogicPlay),
  },
  {
    path: 'entrainements/simulation/session/:sessionId/axe/:axis',
    canMatch: [simulationAxisMatcher(AxisType.MEMORY)],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./memory-play/memory-play').then((m) => m.MemoryPlay),
  },
  {
    path: 'entrainements/simulation/session/:sessionId/axe/:axis',
    canMatch: [simulationAxisMatcher(AxisType.VISUAL_DISCRIMINATION)],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./discrimination-play/discrimination-play').then(
        (m) => m.DiscriminationPlay,
      ),
  },
  {
    path: 'entrainements/simulation/session/:sessionId/axe/:axis',
    canMatch: [simulationAxisMatcher(AxisType.REACTIVITY)],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./reactivity-play/reactivity-play').then(
        (m) => m.ReactivityPlay,
      ),
  },
  {
    path: 'entrainements/simulation/session/:sessionId/axe/:axis',
    canMatch: [simulationAxisMatcher(AxisType.MOTOR_SKILLS)],
    data: { focusedHeader: simulationPlayHeader },
    loadComponent: () =>
      import('./motricity-play/motricity-play').then((m) => m.MotricityPlay),
  },
  {
    path: 'entrainements/cible/:axis',
    data: {
      focusedHeader: {
        backLabel: 'Entraînement ciblé',
        backLink: '/entrainements/choisir-axe',
        closeLink: '/entrainements',
        axisParam: 'axis',
      },
    },
    loadComponent: () =>
      import('./axis-start/axis-start').then((m) => m.AxisStart),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId',
    canMatch: [axisSessionMatcher(AxisType.LOGIC)],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
        showHelp: true,
      },
    },
    loadComponent: () =>
      import('./logic-play/logic-play').then((m) => m.LogicPlay),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/resultat',
    canMatch: [axisSessionMatcher(AxisType.LOGIC)],
    data: {
      mobileFlow: { axisParam: 'axis', suffix: 'Ciblé' },
    },
    loadComponent: () =>
      import('./logic-result/logic-result').then((m) => m.LogicResult),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/correction',
    canMatch: [axisSessionMatcher(AxisType.LOGIC)],
    data: {
      focusedHeader: {
        title: 'Correction',
        backLabel: 'Résultat',
        backLink: '/entrainements/cible/:axis/session/:sessionId/resultat',
        closeLink: '/entrainements/cible/:axis/session/:sessionId/resultat',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
        showTimer: false,
        live: false,
      },
    },
    loadComponent: () =>
      import('./logic-correction/logic-correction').then(
        (m) => m.LogicCorrection,
      ),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/resultat',
    canMatch: [axisSessionMatcher(AxisType.MEMORY)],
    data: {
      mobileFlow: { axisParam: 'axis', suffix: 'Ciblé' },
    },
    loadComponent: () =>
      import('./memory-result/memory-result').then((m) => m.MemoryResult),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/correction',
    canMatch: [axisSessionMatcher(AxisType.MEMORY)],
    data: {
      focusedHeader: {
        title: 'Correction',
        backLabel: 'Résultat',
        backLink: '/entrainements/cible/:axis/session/:sessionId/resultat',
        closeLink: '/entrainements/cible/:axis/session/:sessionId/resultat',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
        showTimer: false,
        live: false,
      },
    },
    loadComponent: () =>
      import('./memory-correction/memory-correction').then(
        (m) => m.MemoryCorrection,
      ),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId/resultat',
    canMatch: [axisSessionMatcher(AxisType.VISUAL_DISCRIMINATION)],
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
    canMatch: [axisSessionMatcher(AxisType.REACTIVITY)],
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
    canMatch: [axisSessionMatcher(AxisType.MOTOR_SKILLS)],
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
    canMatch: [axisSessionMatcher(AxisType.MEMORY)],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
        showHelp: true,
      },
    },
    loadComponent: () =>
      import('./memory-play/memory-play').then((m) => m.MemoryPlay),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId',
    canMatch: [axisSessionMatcher(AxisType.REACTIVITY)],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
        showHelp: true,
      },
    },
    loadComponent: () =>
      import('./reactivity-play/reactivity-play').then(
        (m) => m.ReactivityPlay,
      ),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId',
    canMatch: [axisSessionMatcher(AxisType.MOTOR_SKILLS)],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
        showHelp: true,
      },
    },
    loadComponent: () =>
      import('./motricity-play/motricity-play').then((m) => m.MotricityPlay),
  },
  {
    path: 'entrainements/cible/:axis/session/:sessionId',
    canMatch: [axisSessionMatcher(AxisType.VISUAL_DISCRIMINATION)],
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
        closeLink: '/entrainements',
        axisParam: 'axis',
        axisChip: true,
        showEnergy: false,
        showHelp: true,
      },
    },
    loadComponent: () =>
      import('./discrimination-play/discrimination-play').then(
        (m) => m.DiscriminationPlay,
      ),
  },
];
