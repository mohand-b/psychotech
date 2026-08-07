const GAMEPAD_MARKER = '/manette';
const EXAM_AXIS_PLAY_MARKER = '/axe/';
const PLAY_SESSION_TAIL = /\/session\/[^/]+$/;

export function isQuietForCelebration(url: string): boolean {
  return (
    !url.includes(GAMEPAD_MARKER) &&
    !url.includes(EXAM_AXIS_PLAY_MARKER) &&
    !PLAY_SESSION_TAIL.test(url)
  );
}
