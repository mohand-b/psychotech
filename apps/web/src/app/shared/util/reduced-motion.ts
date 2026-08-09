const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(view: Window | null | undefined): boolean {
  if (typeof view?.matchMedia !== 'function') {
    return true;
  }
  return view.matchMedia(REDUCED_MOTION_QUERY).matches;
}
