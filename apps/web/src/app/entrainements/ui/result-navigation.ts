import { Router } from '@angular/router';

export function backFromTargetedResult(
  router: Router,
  cameFromPlay: boolean,
): void {
  if (cameFromPlay) {
    router.navigate(['/entrainements'], { queryParams: { panel: 'cible' } });
    return;
  }
  router.navigate(['/sessions']);
}
