import { Location } from '@angular/common';
import { Router } from '@angular/router';

const FIRST_NAVIGATION_ID = 1;

export function navigateBack(
  location: Location,
  router: Router,
  fallbackUrl: string,
): void {
  const state = location.getState() as { navigationId?: number } | null;
  if ((state?.navigationId ?? FIRST_NAVIGATION_ID) > FIRST_NAVIGATION_ID) {
    location.back();
  } else {
    void router.navigateByUrl(fallbackUrl);
  }
}
