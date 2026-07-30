import { MotricityPoint } from '@psychotech/shared';

export function formatPoints(points: readonly MotricityPoint[]): string {
  return points
    .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
    .join(' ');
}
