const PLAY_URL_MARKERS = [
  '/session/',
  '/tutoriel',
  '/resultat',
  '/correction',
  '/manette',
];

export function isQuietForCelebration(url: string): boolean {
  return !PLAY_URL_MARKERS.some((marker) => url.includes(marker));
}
