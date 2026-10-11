import {
  PLAY_APP_SESSION_KEY,
  PLAY_APP_SESSION_VALUE,
} from './play-app-context';

export function startPlayAppSession(): void {
  window.sessionStorage.setItem(PLAY_APP_SESSION_KEY, PLAY_APP_SESSION_VALUE);
}

export function endPlayAppSession(): void {
  window.sessionStorage.removeItem(PLAY_APP_SESSION_KEY);
}
