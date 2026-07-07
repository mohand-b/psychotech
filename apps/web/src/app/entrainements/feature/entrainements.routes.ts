import { CanMatchFn, Route, UrlSegment } from '@angular/router';
import { AxisType } from '@psychotech/shared';

function axisSessionMatcher(axis: AxisType): CanMatchFn {
  return (_route: Route, segments: UrlSegment[]) => segments[2]?.path === axis;
}

export const entrainementsRoutes: Route[] = [
  {
    path: 'entrainements',
    loadComponent: () =>
      import('./entrainements/entrainements').then((m) => m.Entrainements),
  },
  {
    path: 'entrainements/choisir-axe',
    data: {
      focusedHeader: {
        title: 'Entraînement ciblé',
        backLabel: 'Entraînements',
        backLink: '/entrainements',
      },
    },
    loadComponent: () =>
      import('./axis-selection/axis-selection').then((m) => m.AxisSelection),
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
