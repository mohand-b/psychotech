import { HttpResourceRef } from '@angular/common/http';
import { Signal, computed } from '@angular/core';

export function readResourceValueOr<T>(
  resource: HttpResourceRef<T>,
  fallback: T,
): Signal<T> {
  return computed(() => (resource.hasValue() ? resource.value() : fallback));
}
