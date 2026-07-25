import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Clock {
  now(): Date {
    return new Date();
  }
}
