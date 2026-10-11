import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree, provideRouter } from '@angular/router';
import {
  PLAY_APP_SESSION_KEY,
  PlayAppContext,
  isPlayAppLaunch,
  websiteOnlyGuard,
} from './play-app-context';

const ORIGINAL_PATH = window.location.pathname;

function createContext(platform: 'browser' | 'server' = 'browser') {
  TestBed.configureTestingModule({
    providers: [{ provide: PLATFORM_ID, useValue: platform }],
  });
  return TestBed.inject(PlayAppContext);
}

describe('isPlayAppLaunch', () => {
  it('recognizes the launch URL of the Play app', () => {
    expect(isPlayAppLaunch('?source=twa', '')).toBe(true);
  });

  it('recognizes the referrer of the Android app', () => {
    expect(
      isPlayAppLaunch('', 'android-app://com.psychotechtraining.app/'),
    ).toBe(true);
  });

  it('ignores an ordinary visit and another Android app', () => {
    expect(isPlayAppLaunch('', 'https://www.google.com/')).toBe(false);
    expect(
      isPlayAppLaunch('?source=mail', 'android-app://com.other.app/'),
    ).toBe(false);
  });
});

describe('PlayAppContext', () => {
  afterEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', ORIGINAL_PATH);
  });

  it('stays in website mode for an ordinary visit', () => {
    expect(createContext().isPlayApp()).toBe(false);
  });

  it('switches to the Play app mode on the app launch and remembers it for the session', () => {
    window.history.replaceState({}, '', '/dashboard?source=twa');

    expect(createContext().isPlayApp()).toBe(true);
    expect(window.sessionStorage.getItem(PLAY_APP_SESSION_KEY)).toBe('true');
  });

  it('keeps the Play app mode after navigating away from the launch URL', () => {
    window.sessionStorage.setItem(PLAY_APP_SESSION_KEY, 'true');
    window.history.replaceState({}, '', '/credits');

    expect(createContext().isPlayApp()).toBe(true);
  });

  it('never enables the Play app mode while prerendering', () => {
    window.history.replaceState({}, '', '/dashboard?source=twa');

    expect(createContext('server').isPlayApp()).toBe(false);
  });
});

describe('websiteOnlyGuard', () => {
  afterEach(() => window.sessionStorage.clear());

  function runGuard(): boolean | UrlTree {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    return TestBed.runInInjectionContext(
      () => websiteOnlyGuard({}, []) as boolean | UrlTree,
    );
  }

  it('lets the website pages through on the website', () => {
    expect(runGuard()).toBe(true);
  });

  it('sends the Play app to the dashboard instead of a website page', () => {
    window.sessionStorage.setItem(PLAY_APP_SESSION_KEY, 'true');

    const result = runGuard();

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/dashboard',
    );
  });
});
