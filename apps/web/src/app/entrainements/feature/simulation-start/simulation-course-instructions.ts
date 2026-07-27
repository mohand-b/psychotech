import { AxisType, RailwayPlayableAxis } from '@psychotech/shared';

export const SIMULATION_COURSE_INSTRUCTIONS: Record<
  RailwayPlayableAxis,
  string
> = {
  [AxisType.LOGIC]:
    'Quatre blocs s’enchaînent sous un chrono global : suites numériques et triangles chiffrés, dominos, puis deux séries de matrices.',
  [AxisType.MEMORY]:
    'Une séquence de chiffres s’affiche puis disparaît : restituez-la de mémoire, dans l’ordre demandé, parfois à l’envers.',
  [AxisType.VISUAL_DISCRIMINATION]:
    'Deux suites de caractères s’affichent côte à côte : décidez au plus vite si elles sont identiques ou différentes.',
  [AxisType.REACTIVITY]:
    'Des signaux apparaissent à un rythme imprévisible : déclenchez la bonne commande pour chacun, le plus vite possible.',
  [AxisType.MOTOR_SKILLS]:
    'Guidez le point dans le couloir avec les deux manivelles, une par direction, sans toucher les bords.',
};
