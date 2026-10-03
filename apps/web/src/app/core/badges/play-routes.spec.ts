import { isOutsidePlayRoute } from './play-routes';

describe('isOutsidePlayRoute', () => {
  it('blocks every play surface', () => {
    expect(isOutsidePlayRoute('/entrainements/cible/logique/session/abc')).toBe(
      false,
    );
    expect(
      isOutsidePlayRoute('/entrainements/tutoriel/logique/session/abc'),
    ).toBe(false);
    expect(
      isOutsidePlayRoute('/entrainements/examen-blanc/session/abc/axe/MEMORY'),
    ).toBe(false);
    expect(isOutsidePlayRoute('/entrainements/examen-blanc/session/abc')).toBe(
      false,
    );
    expect(isOutsidePlayRoute('/manette/abc')).toBe(false);
  });

  it('allows the result and everyday surfaces', () => {
    expect(
      isOutsidePlayRoute('/entrainements/cible/logique/session/abc/resultat'),
    ).toBe(true);
    expect(isOutsidePlayRoute('/sessions/abc/bilan')).toBe(true);
    expect(isOutsidePlayRoute('/dashboard')).toBe(true);
    expect(isOutsidePlayRoute('/credits')).toBe(true);
    expect(isOutsidePlayRoute('/badges')).toBe(true);
    expect(isOutsidePlayRoute('/verification')).toBe(true);
  });
});
