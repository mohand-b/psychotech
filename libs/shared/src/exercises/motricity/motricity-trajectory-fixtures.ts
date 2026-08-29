import { MotricitySampleDto } from '../../dtos/session';
import {
  MotricityCourse,
  MotricityPoint,
  motricityCursorZone,
} from './motricity-course';

export const FRAME_MS = 1000 / 60;

export function centerlinePositionAtPct(
  course: MotricityCourse,
  pct: number,
): MotricityPoint {
  let remaining = (pct / 100) * course.totalLength;
  let position = course.centerline[0];
  for (const segment of course.segments) {
    if (remaining <= segment.length) {
      const ratio = remaining / segment.length;
      return {
        x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
        y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
      };
    }
    remaining -= segment.length;
    position = segment.end;
  }
  return position;
}

export function walkCenterline(
  course: MotricityCourse,
  durationMs: number,
  untilPct = 100,
): MotricitySampleDto[] {
  const sampleCount = Math.round(durationMs / FRAME_MS);
  const samples: MotricitySampleDto[] = [];
  for (let index = 0; index <= sampleCount; index += 1) {
    const position = centerlinePositionAtPct(
      course,
      (index / sampleCount) * untilPct,
    );
    samples.push({
      t: Math.round(index * FRAME_MS),
      x: position.x,
      y: position.y,
    });
  }
  return samples;
}

export function outsidePointNear(
  course: MotricityCourse,
  target: MotricityPoint,
): MotricityPoint {
  const directions = [
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: -1, y: 0 },
  ];
  for (let radius = 40; radius <= 400; radius += 20) {
    for (const direction of directions) {
      const candidate = {
        x: target.x + direction.x * radius,
        y: target.y + direction.y * radius,
      };
      if (motricityCursorZone(course, candidate) === 'OUTSIDE') {
        return candidate;
      }
    }
  }
  throw new Error('No outside point found near target');
}
