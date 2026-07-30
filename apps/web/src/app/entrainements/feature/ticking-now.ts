import { DestroyRef, Signal, inject, signal } from '@angular/core';

export const COUNTDOWN_TICK_MS = 30_000;

export function tickingNow(intervalMs: number): Signal<Date> {
  const destroyRef = inject(DestroyRef);
  const now = signal(new Date());
  const intervalId = setInterval(() => now.set(new Date()), intervalMs);
  destroyRef.onDestroy(() => clearInterval(intervalId));
  return now.asReadonly();
}
