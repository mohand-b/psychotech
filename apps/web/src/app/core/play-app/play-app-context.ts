import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { GOOGLE_PLAY_PACKAGE_NAME } from '@psychotech/shared';

export const PLAY_APP_SOURCE_PARAM = 'source';
export const PLAY_APP_SOURCE = 'twa';
export const PLAY_APP_SESSION_KEY = 'psychotech.play-app';

const PLAY_APP_HOME_ROUTE = '/dashboard';
const PLAY_APP_REFERRER = `android-app://${GOOGLE_PLAY_PACKAGE_NAME}`;
export const PLAY_APP_SESSION_VALUE = 'true';

export function isPlayAppLaunch(search: string, referrer: string): boolean {
  return (
    new URLSearchParams(search).get(PLAY_APP_SOURCE_PARAM) ===
      PLAY_APP_SOURCE || referrer.startsWith(PLAY_APP_REFERRER)
  );
}

function readPlayAppMarker(view: Window): boolean {
  try {
    return (
      view.sessionStorage.getItem(PLAY_APP_SESSION_KEY) ===
      PLAY_APP_SESSION_VALUE
    );
  } catch {
    return false;
  }
}

function writePlayAppMarker(view: Window): void {
  try {
    view.sessionStorage.setItem(PLAY_APP_SESSION_KEY, PLAY_APP_SESSION_VALUE);
  } catch {
    return;
  }
}

@Injectable({ providedIn: 'root' })
export class PlayAppContext {
  private readonly document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  readonly isPlayApp: Signal<boolean> = signal(
    this.detectPlayApp(),
  ).asReadonly();

  private detectPlayApp(): boolean {
    const view = this.document.defaultView;
    if (!this.isBrowser || view === null) {
      return false;
    }
    if (readPlayAppMarker(view)) {
      return true;
    }
    if (!isPlayAppLaunch(view.location.search, this.document.referrer)) {
      return false;
    }
    writePlayAppMarker(view);
    return true;
  }
}

export const websiteOnlyGuard: CanMatchFn = (): boolean | UrlTree =>
  inject(PlayAppContext).isPlayApp()
    ? inject(Router).parseUrl(PLAY_APP_HOME_ROUTE)
    : true;
