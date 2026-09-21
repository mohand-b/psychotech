import { TestBed } from '@angular/core/testing';
import {
  RELEASE_LOG,
  ReleaseCategory,
  UPCOMING_ITEMS,
  formatVersionLabel,
  releaseAnchor,
} from './release-log';
import { ReleaseLogFacade } from './release-log.facade';

const SEMVER = /^\d+\.\d+\.\d+$/;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const INTERNAL_VOCABULARY =
  /prerender|seed|migration|webhook|notion|railway|stripe|endpoint|rate limit|captcha|tutoriel|énergie|barème|coefficient/i;
const READER_ADDRESS =
  /(?<!\p{L})(tu|ton|ta|tes|toi|vous|votre|vos|nous|notre|nos)(?!\p{L})/iu;
const DATE_OR_COMMITMENT = /\b20\d{2}\b|bientôt|prochainement|d’ici/i;

function everyText(): string[] {
  return RELEASE_LOG.flatMap((release) => [
    release.title,
    ...Object.values(release.entries).flat(),
  ]);
}

describe('release log', () => {
  it('porte des numéros de version uniques et des dates de livraison valides', () => {
    const versions = RELEASE_LOG.map((release) => release.version);
    expect(new Set(versions).size).toBe(versions.length);
    for (const release of RELEASE_LOG) {
      expect(release.version).toMatch(SEMVER);
      expect(release.releasedOn).toMatch(ISO_DAY);
      expect(Number.isNaN(Date.parse(release.releasedOn))).toBe(false);
    }
  });

  it('reprend les versions livrées du changelog, aux mêmes dates', () => {
    expect(
      RELEASE_LOG.map(({ version, releasedOn }) => ({ version, releasedOn })),
    ).toEqual(
      expect.arrayContaining([
        { version: '1.0.0', releasedOn: '2026-09-19' },
        { version: '1.1.0', releasedOn: '2026-09-20' },
      ]),
    );
  });

  it('ne publie aucune version sans entrée ni aucune entrée vide', () => {
    for (const release of RELEASE_LOG) {
      const texts = Object.values(release.entries).flat();
      expect(texts.length).toBeGreaterThan(0);
      for (const text of texts) {
        expect(text.trim().length).toBeGreaterThan(0);
      }
      for (const category of Object.keys(release.entries)) {
        expect(Object.values(ReleaseCategory)).toContain(category);
      }
    }
  });

  it('reste impersonnel : aucune adresse au lecteur, aucun terme technique interne', () => {
    const upcomingTexts = UPCOMING_ITEMS.flatMap(({ text, detail }) => [
      text,
      detail,
    ]);
    for (const text of [...everyText(), ...upcomingTexts]) {
      expect(text).not.toMatch(INTERNAL_VOCABULARY);
      expect(text).not.toMatch(READER_ADDRESS);
    }
  });

  it('n’annonce que l’espace entreprise et le Play Store, sans date ni engagement', () => {
    expect(UPCOMING_ITEMS).toHaveLength(2);
    expect(UPCOMING_ITEMS[0].text).toContain('Espace entreprise');
    expect(UPCOMING_ITEMS[1].text).toContain('Play Store');
    for (const item of UPCOMING_ITEMS) {
      expect(`${item.text} ${item.detail}`).not.toMatch(DATE_OR_COMMITMENT);
    }
  });

  it('dérive une étiquette et une ancre stables de chaque version', () => {
    expect(formatVersionLabel('1.1.0')).toBe('v1.1.0');
    expect(releaseAnchor('1.1.0')).toBe('v1-1-0');
  });
});

describe('ReleaseLogFacade', () => {
  it('expose les versions de la plus récente à la plus ancienne', () => {
    const facade = TestBed.inject(ReleaseLogFacade);
    const dates = facade.releases().map((release) => release.releasedOn);

    expect(dates).toEqual([...dates].sort().reverse());
    expect(facade.latestVersionLabel()).toBe(
      formatVersionLabel(facade.releases()[0].version),
    );
  });
});
