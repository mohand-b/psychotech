import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import {
  EnergyStateDto,
  ProgressionDto,
  Sector,
  SectorSummaryDto,
  UserProfileDto,
} from '@psychotech/shared';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { ProgressionFacade } from '../../../progression/data-access/progression.facade';
import { Profile } from './profile';

function buildUser(overrides: Partial<UserProfileDto> = {}): UserProfileDto {
  return {
    id: 'user-1',
    email: 'mohand@example.com',
    firstName: 'Mohand',
    lastName: 'Boudjema',
    locale: 'fr-FR',
    timezone: 'Europe/Paris',
    currentSector: Sector.RAILWAY,
    createdAt: '2026-04-14T00:00:00.000Z',
    ...overrides,
  };
}

function buildEnergy(): EnergyStateDto {
  return {
    balance: 5,
    capacity: 5,
    resetsAt: '2026-07-26T00:00:00.000Z',
    canStartFull: true,
    canStartAxis: true,
  };
}

function buildProgression(): ProgressionDto {
  return {
    stats: {
      currentStreak: 3,
      longestStreak: 5,
      completedSessions: 23,
      fullSessionsCount: 4,
      targetedSessionsCount: 19,
      firstSessionAt: '2026-04-15T10:00:00.000Z',
      firstFullSessionAt: '2026-04-15T10:00:00.000Z',
      firstGlobalScore: 60,
      bestGlobalScore: 74.8,
      bestGlobalScoreAt: '2026-07-10T10:00:00.000Z',
    },
    evolution: [],
    axes: [],
    radar: { first: [], last: [] },
  };
}

const CATALOG_SECTORS: SectorSummaryDto[] = [
  { code: Sector.RAILWAY, label: 'Ferroviaire', isActive: true },
  { code: Sector.HEALTHCARE, label: 'Santé', isActive: false },
  { code: Sector.AVIATION, label: 'Aérien', isActive: false },
  { code: Sector.SECURITY, label: 'Sécurité', isActive: false },
  { code: Sector.DRIVING, label: 'Conduite', isActive: false },
];

interface SetupOptions {
  user?: UserProfileDto;
  changePasswordResult?: () => Observable<UserProfileDto>;
}

async function setup(options: SetupOptions = {}) {
  TestBed.resetTestingModule();
  const user = signal<UserProfileDto | null>(options.user ?? buildUser());
  const updateProfile = vi.fn(
    (payload: { firstName: string; lastName: string }) => {
      const current = user();
      const updated = buildUser({ ...current, ...payload });
      user.set(updated);
      return of(updated);
    },
  );
  const changePassword = vi.fn(() =>
    options.changePasswordResult
      ? options.changePasswordResult()
      : of(user() ?? buildUser()),
  );

  await TestBed.configureTestingModule({
    imports: [Profile],
    providers: [
      provideRouter([]),
      {
        provide: AuthFacade,
        useValue: {
          currentUser: user,
          updateProfile,
          changePassword,
          logout: vi.fn().mockReturnValue(of(undefined)),
        },
      },
      { provide: EnergyFacade, useValue: { state: signal(buildEnergy()) } },
      {
        provide: CatalogFacade,
        useValue: {
          sectors: signal(CATALOG_SECTORS),
          sectorsError: signal(null),
        },
      },
    ],
  })
    .overrideComponent(Profile, {
      set: {
        providers: [
          {
            provide: ProgressionFacade,
            useValue: {
              progression: signal<ProgressionDto | null>(buildProgression()),
              loading: signal(false),
            },
          },
        ],
      },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(Profile);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  fixture.detectChanges();
  return { fixture, navigate, updateProfile, changePassword };
}

function textOf(fixture: { nativeElement: HTMLElement }): string {
  return fixture.nativeElement.textContent ?? '';
}

function navButtons(fixture: {
  nativeElement: HTMLElement;
}): HTMLButtonElement[] {
  return Array.from(
    (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
      '.profil__nav-item',
    ),
  );
}

function input(
  fixture: { nativeElement: HTMLElement },
  index: number,
): HTMLInputElement {
  return fixture.nativeElement.querySelectorAll<HTMLInputElement>(
    '.profil__input',
  )[index];
}

describe('Profile', () => {
  it('renders the identity rail with the sector and account facts', async () => {
    const { fixture } = await setup();
    expect(textOf(fixture)).toContain('Mohand Boudjema');
    expect(textOf(fixture)).toContain('Ferroviaire');
    expect(textOf(fixture)).toContain('Informations personnelles');
    expect(textOf(fixture)).toContain('14 avril 2026');
    expect(textOf(fixture)).toContain('23');
    expect(input(fixture, 0).value).toBe('Mohand');
    expect(input(fixture, 1).value).toBe('Boudjema');
    expect(input(fixture, 2).disabled).toBe(true);
  });

  it('switches sections from the rail navigation', async () => {
    const { fixture } = await setup();
    const buttons = navButtons(fixture);
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'Informations',
      'Sécurité',
      'Secteur',
    ]);

    buttons[2].click();
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Secteur de préparation');
    expect(
      fixture.nativeElement.querySelectorAll('.profil__sector'),
    ).toHaveLength(5);
    expect(
      fixture.nativeElement.querySelector('.profil__sector--active')
        ?.textContent,
    ).toContain('Ferroviaire');
    const coming = fixture.nativeElement.querySelectorAll(
      '.profil__sector--coming',
    );
    expect(coming).toHaveLength(4);
    expect(coming[0].textContent).toContain('À venir');
    expect(coming[0].getAttribute('aria-disabled')).toBe('true');
    expect(
      fixture.nativeElement.querySelector('.profil__sector--active')
        ?.textContent,
    ).not.toContain('À venir');
  });

  it('walks the footer states from idle to dirty to saved', async () => {
    const { fixture, updateProfile } = await setup();
    expect(textOf(fixture)).toContain('Aucune modification en attente');

    const firstName = input(fixture, 0);
    firstName.value = 'Idir';
    firstName.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(textOf(fixture)).toContain('Modifications non enregistrées');

    (
      fixture.nativeElement.querySelector(
        '.profil__action-save',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(updateProfile).toHaveBeenCalledWith({
      firstName: 'Idir',
      lastName: 'Boudjema',
    });
    expect(textOf(fixture)).toContain('Modifications enregistrées');
  });

  it('changes the password from the security tab and clears the form on success', async () => {
    const { fixture, changePassword } = await setup();
    navButtons(fixture)[1].click();
    fixture.detectChanges();

    expect(textOf(fixture)).toContain(
      'Modifiez votre mot de passe. Il vous sera demandé à chaque connexion.',
    );
    expect(textOf(fixture)).toContain('8 caractères minimum');
    expect(textOf(fixture)).not.toContain('Un chiffre');

    const fields = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLInputElement>('.profil__input');
    fields[0].value = 'AncienSecret1';
    fields[0].dispatchEvent(new Event('input'));
    fields[1].value = 'NouveauSecret1';
    fields[1].dispatchEvent(new Event('input'));
    fields[2].value = 'NouveauSecret1';
    fields[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(textOf(fixture)).toContain('Mots de passe identiques');
    (
      fixture.nativeElement.querySelector(
        '.profil__action-save',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'AncienSecret1',
      newPassword: 'NouveauSecret1',
    });
    expect(textOf(fixture)).toContain('Mot de passe mis à jour');
    expect(input(fixture, 0).value).toBe('');
  });

  it('surfaces an invalid current password error from the api', async () => {
    const { fixture, changePassword } = await setup({
      changePasswordResult: () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              error: { message: 'INVALID_CURRENT_PASSWORD' },
            }),
        ),
    });
    navButtons(fixture)[1].click();
    fixture.detectChanges();

    const fields = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLInputElement>('.profil__input');
    fields[0].value = 'MauvaisActuel1';
    fields[0].dispatchEvent(new Event('input'));
    fields[1].value = 'NouveauSecret1';
    fields[1].dispatchEvent(new Event('input'));
    fields[2].value = 'NouveauSecret1';
    fields[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.profil__action-save',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(changePassword).toHaveBeenCalled();
    expect(textOf(fixture)).toContain('Mot de passe actuel invalide.');
  });

  it('keeps the save action inert while the password form is incomplete', async () => {
    const { fixture, changePassword } = await setup();
    navButtons(fixture)[1].click();
    fixture.detectChanges();

    const fields = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLInputElement>('.profil__input');
    fields[0].value = 'AncienSecret1';
    fields[0].dispatchEvent(new Event('input'));
    fields[1].value = 'court';
    fields[1].dispatchEvent(new Event('input'));
    fields[2].value = 'court';
    fields[2].dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.profil__action-save',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(changePassword).not.toHaveBeenCalled();
  });

  it('cancels pending edits back to the stored profile', async () => {
    const { fixture, updateProfile } = await setup();
    const firstName = input(fixture, 0);
    firstName.value = 'Idir';
    firstName.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector(
        '.profil__action-cancel',
      ) as HTMLButtonElement
    ).click();
    fixture.detectChanges();

    expect(input(fixture, 0).value).toBe('Mohand');
    expect(textOf(fixture)).toContain('Aucune modification en attente');
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
