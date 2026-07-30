import { AxisType, RailwayPlayableAxis } from '@psychotech/shared';

interface SimulationCourseEntry {
  instruction: string;
  duration: string;
}

export const SIMULATION_COURSE: Record<
  RailwayPlayableAxis,
  SimulationCourseEntry
> = {
  [AxisType.LOGIC]: {
    instruction:
      'Quatre blocs s’enchaînent sous un chrono global : suites numériques et triangles chiffrés, dominos, puis deux séries de matrices.',
    duration: '~10 min',
  },
  [AxisType.MEMORY]: {
    instruction:
      'Une séquence de chiffres s’affiche puis disparaît : restituez-la de mémoire, dans l’ordre demandé, parfois à l’envers.',
    duration: '~4 min',
  },
  [AxisType.VISUAL_DISCRIMINATION]: {
    instruction:
      'Deux suites de caractères s’affichent côte à côte : décidez au plus vite si elles sont identiques ou différentes.',
    duration: '~3 min',
  },
  [AxisType.REACTIVITY]: {
    instruction:
      'Des signaux apparaissent à un rythme imprévisible : déclenchez la bonne commande pour chacun, le plus vite possible.',
    duration: '~2 min',
  },
  [AxisType.MOTOR_SKILLS]: {
    instruction:
      'Guidez le point dans le couloir avec les deux manivelles, une par direction, sans toucher les bords.',
    duration: '~5 min',
  },
};
