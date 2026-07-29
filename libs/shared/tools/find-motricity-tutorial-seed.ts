import { MOTRICITY_TUTORIAL_START_WIDTH } from '../src/domain/axis-tutorial';
import {
  MOTRICITY_CANVAS_WIDTH,
  MotricityCourse,
} from '../src/exercises/motricity/motricity-course';
import { generateMotricityCourses } from '../src/exercises/motricity/generate-motricity-courses';

const LEFT_THIRD_X = MOTRICITY_CANVAS_WIDTH / 3;
const CANDIDATE_COUNT = 4000;
const SIMPLE_SEGMENT_COUNT = 3;

function courseOf(seed: string): MotricityCourse | null {
  try {
    return generateMotricityCourses(seed, {
      courseCount: 1,
      startWidths: [MOTRICITY_TUTORIAL_START_WIDTH],
    })[0];
  } catch {
    return null;
  }
}

function garageCenterX(course: MotricityCourse): number {
  return course.garage.x + course.garage.width / 2;
}

function endCenterX(course: MotricityCourse): number {
  return course.endZone.x + course.endZone.width / 2;
}

function describe(seed: string, course: MotricityCourse): string {
  return [
    seed.padEnd(34),
    `garage x=${garageCenterX(course).toFixed(0)}`.padEnd(16),
    `start x=${course.startPosition.x.toFixed(0)}`.padEnd(15),
    `end x=${endCenterX(course).toFixed(0)}`.padEnd(13),
    `segments=${course.segments.length}`.padEnd(13),
    `length=${course.totalLength.toFixed(0)}`,
  ].join(' ');
}

const matches: { seed: string; course: MotricityCourse }[] = [];

for (let index = 1; index <= CANDIDATE_COUNT; index += 1) {
  const seed = `psychotech-tutoriel-motricite-v${index}`;
  const course = courseOf(seed);
  if (!course) {
    continue;
  }
  const startsLeft =
    garageCenterX(course) < LEFT_THIRD_X &&
    course.startPosition.x < LEFT_THIRD_X;
  const isSimple = course.segments.length === SIMPLE_SEGMENT_COUNT;
  if (startsLeft && isSimple) {
    matches.push({ seed, course });
    if (matches.length >= 10) {
      break;
    }
  }
}

console.log(`left-start simple candidates: ${matches.length}`);
for (const match of matches) {
  console.log(describe(match.seed, match.course));
}
