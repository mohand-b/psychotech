import { Component, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HybridHeader } from '../../../layout/hybrid-header/hybrid-header';
import {
  Release,
  ReleaseCategory,
  UpcomingItem,
  UpcomingStatus,
} from '../../data-access/release-log';
import { ReleaseLogFacade } from '../../data-access/release-log.facade';
import { Nouveautes } from './nouveautes';

@Component({ selector: 'app-hybrid-header', template: '' })
class HybridHeaderStub {
  readonly mobileTitle = input.required<string>();
}

const RELEASES: Release[] = [
  {
    version: '1.1.0',
    releasedOn: '2026-09-20',
    title: 'Formulaire de contact',
    entries: {
      [ReleaseCategory.NEW]: ['Page Contact.'],
      [ReleaseCategory.FIX]: ['Un correctif.'],
    },
  },
  {
    version: '1.0.0',
    releasedOn: '2026-09-01',
    title: 'Lancement public',
    entries: { [ReleaseCategory.NEW]: ['Cinq épreuves.'] },
  },
];

const UPCOMING: UpcomingItem[] = [
  {
    status: UpcomingStatus.UNDER_STUDY,
    text: 'Espace entreprise.',
    detail: 'Avec accord.',
  },
];

describe('Nouveautes', () => {
  let fixture: ComponentFixture<Nouveautes>;
  let host: HTMLElement;

  async function setup(releases: Release[] = RELEASES): Promise<void> {
    await TestBed.configureTestingModule({
      imports: [Nouveautes],
      providers: [
        provideRouter([]),
        {
          provide: ReleaseLogFacade,
          useValue: {
            releases: signal(releases),
            upcoming: signal(UPCOMING),
          },
        },
      ],
    })
      .overrideComponent(Nouveautes, {
        remove: { imports: [HybridHeader] },
        add: { imports: [HybridHeaderStub] },
      })
      .compileComponents();
    fixture = TestBed.createComponent(Nouveautes);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function texts(selector: string): string[] {
    return Array.from(host.querySelectorAll(selector)).map(
      (element) => element.textContent?.trim() ?? '',
    );
  }

  function clickFilter(label: string): void {
    const button = Array.from(
      host.querySelectorAll<HTMLButtonElement>('.filter'),
    ).find((candidate) => candidate.textContent?.trim() === label);
    button?.click();
    fixture.detectChanges();
  }

  it('affiche chaque version avec son numéro, sa date et son ancre', async () => {
    await setup();

    expect(texts('.step__version')).toEqual(['v1.1.0', 'v1.0.0']);
    expect(texts('time.step__date')).toEqual([
      '20 septembre 2026',
      '1er septembre 2026',
    ]);
    expect(host.querySelector('#v1-1-0')).not.toBeNull();
    expect(host.querySelector('#v1-0-0')).not.toBeNull();
  });

  it('ne marque que la première version comme la dernière', async () => {
    await setup();

    expect(texts('.step__latest')).toEqual(['Dernière version']);
    expect(
      host.querySelector('#v1-1-0 .step__latest')?.textContent,
    ).toBeTruthy();
  });

  it('étiquette chaque entrée selon sa catégorie', async () => {
    await setup();

    expect(texts('#v1-1-0 .tag')).toEqual(['Nouveau', 'Correction']);
    expect(host.querySelector('#v1-1-0 .tag--fix')?.textContent?.trim()).toBe(
      'Correction',
    );
  });

  it('filtre par catégorie, écarte les versions vides et masque le bloc à venir', async () => {
    await setup();
    expect(texts('.filter')).toEqual(['Tout', 'Nouveautés', 'Corrections']);
    expect(host.querySelector('#prevu')).not.toBeNull();

    clickFilter('Corrections');

    expect(texts('.step__version')).toEqual(['v1.1.0']);
    expect(texts('.timeline .item__text')).toEqual(['Un correctif.']);
    expect(host.querySelector('#prevu')).toBeNull();

    clickFilter('Tout');
    expect(texts('.step__version')).toEqual(['v1.1.0', 'v1.0.0']);
  });

  it('ne propose aucun filtre quand une seule catégorie existe', async () => {
    await setup([RELEASES[1]]);

    expect(host.querySelector('.filters')).toBeNull();
  });

  it('liste toutes les versions dans le sommaire, même filtrées', async () => {
    await setup();
    clickFilter('Corrections');

    expect(texts('.toc__name')).toEqual(['À venir', 'v1.1.0', 'v1.0.0']);
    expect(texts('.toc__date')).toEqual([
      'prévisionnel',
      'septembre 2026',
      'septembre 2026',
    ]);
  });

  it('renvoie vers le formulaire de suggestion', async () => {
    await setup();

    const action = host.querySelector('.panel__action') as HTMLAnchorElement;
    expect(action.getAttribute('href')).toBe('/contact?motif=suggestion');
  });
});
