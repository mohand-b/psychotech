import { Resource, Signal, computed } from '@angular/core';

export function readResourceValueOr<T>(
  resource: Resource<T>,
  fallback: T,
): Signal<T> {
  return computed(() => (resource.hasValue() ? resource.value() : fallback));
}
