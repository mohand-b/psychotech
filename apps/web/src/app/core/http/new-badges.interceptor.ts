import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { EarnedBadgeDto } from '@psychotech/shared';
import { tap } from 'rxjs';
import { BadgeStore } from '../badges/badge.store';

function earnedBadgesOf(body: unknown): EarnedBadgeDto[] | null {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  const candidate = (body as { newBadges?: unknown }).newBadges;
  if (!Array.isArray(candidate) || candidate.length === 0) {
    return null;
  }
  const valid = candidate.every(
    (entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof (entry as EarnedBadgeDto).badgeId === 'string' &&
      typeof (entry as EarnedBadgeDto).earnedAt === 'string' &&
      Array.isArray((entry as EarnedBadgeDto).conditions),
  );
  return valid ? (candidate as EarnedBadgeDto[]) : null;
}

/*
 * Plomberie assumée hors façade : ce point d'entrée unique route le champ
 * additif `newBadges` des réponses des endpoints déclencheurs vers la file de
 * célébration globale, sans jamais muter ni retarder la réponse elle-même.
 */
export const newBadgesInterceptor: HttpInterceptorFn = (request, next) => {
  const store = inject(BadgeStore);
  return next(request).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const badges = earnedBadgesOf(event.body);
        if (badges) {
          store.enqueue(badges);
        }
      }
    }),
  );
};
