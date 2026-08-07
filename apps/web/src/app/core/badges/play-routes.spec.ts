import { isQuietForCelebration } from './play-routes';

describe('isQuietForCelebration', () => {
  it('blocks every play surface', () => {
    expect(
      isQuietForCelebration('/entrainements/cible/logique/session/abc'),
    ).toBe(false);
    expect(
      isQuietForCelebration('/entrainements/tutoriel/logique/session/abc'),
    ).toBe(false);
    expect(
      isQuietForCelebration(
        '/entrainements/examen-blanc/session/abc/axe/MEMORY',
      ),
    ).toBe(false);
    expect(isQuietForCelebration('/entrainements/examen-blanc/session/abc')).toBe(
      false,
    );
    expect(isQuietForCelebration('/manette/abc')).toBe(false);
  });

  it('allows the result and everyday surfaces', () => {
    expect(
      isQuietForCelebration(
        '/entrainements/cible/logique/session/abc/resultat',
      ),
    ).toBe(true);
    expect(
      isQuietForCelebration('/sessions/abc/bilan'),
    ).toBe(true);
    expect(isQuietForCelebration('/dashboard')).toBe(true);
    expect(isQuietForCelebration('/credits')).toBe(true);
    expect(isQuietForCelebration('/badges')).toBe(true);
    expect(isQuietForCelebration('/verification')).toBe(true);
  });
});
