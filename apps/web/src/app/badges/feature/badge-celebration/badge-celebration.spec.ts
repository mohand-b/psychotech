import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BadgeId, EarnedBadgeDto, Sector } from '@psychotech/shared';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { BadgeStore } from '../../../core/badges/badge.store';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { BadgesApi } from '../../data-access/badges.api';
import { BadgeCelebration } from './badge-celebration';

const BAPTEME: EarnedBadgeDto = {
  badgeId: BadgeId.EXAM_FIRST,
  earnedAt: '2026-08-07T10:00:00.000Z',
  gain: null,
  conditions: [
    {
      id: 'first-exam',
      label: 'Terminer un premier examen blanc',
      met: true,
      justValidated: true,
    },
  ],
};

const APTE: EarnedBadgeDto = {
  badgeId: BadgeId.EXAM_FAVORABLE,
  earnedAt: '2026-08-07T10:00:01.000Z',
  gain: 2,
  conditions: [
    {
      id: 'favorable',
      label: 'Premier examen blanc au verdict favorable',
      met: true,
      justValidated: true,
    },
  ],
};

async function setup(unacknowledged: EarnedBadgeDto[] = []) {
  const acknowledge = vi.fn().mockReturnValue(of(undefined));
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [BadgeCelebration],
    providers: [
      provideRouter([]),
      {
        provide: BadgesApi,
        useValue: {
          acknowledge,
          unacknowledged: vi.fn().mockReturnValue(of(unacknowledged)),
        },
      },
      { provide: EnergyFacade, useValue: { load: () => of(null) } },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(BadgeCelebration);
  fixture.detectChanges();
  return { fixture, store: TestBed.inject(BadgeStore), acknowledge };
}

function cardOf(fixture: { nativeElement: HTMLElement }): HTMLElement | null {
  return fixture.nativeElement.querySelector('.cb__card');
}

describe('BadgeCelebration', () => {
  it('celebrates a reconciled unacknowledged badge at shell load', async () => {
    const { fixture } = await setup([APTE]);
    fixture.detectChanges();
    const card = cardOf(fixture);
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Apte');
    expect(card?.textContent).toContain('+2');
    expect(card?.textContent).toContain('ajoutés à votre solde');
  });

  it('chains two badges on the advance event and acknowledges each one', async () => {
    const { fixture, store, acknowledge } = await setup();
    store.enqueue([BAPTEME, APTE]);
    fixture.detectChanges();

    let card = cardOf(fixture);
    expect(card?.textContent).toContain('Badge 1 sur 2');
    expect(card?.textContent).toContain('Baptême');
    expect(card?.textContent).toContain('Badge suivant');

    card?.querySelector<HTMLButtonElement>('.cb__cta')?.click();
    fixture.detectChanges();
    card?.dispatchEvent(new Event('animationend'));
    fixture.detectChanges();

    card = cardOf(fixture);
    expect(card?.textContent).toContain('Badge 2 sur 2');
    expect(card?.textContent).toContain('Apte');
    expect(card?.textContent).toContain('Continuer');
    expect(acknowledge).toHaveBeenCalledWith(BadgeId.EXAM_FIRST);

    card?.querySelector<HTMLButtonElement>('.cb__cta')?.click();
    fixture.detectChanges();
    expect(cardOf(fixture)).toBeNull();
    expect(acknowledge).toHaveBeenCalledWith(BadgeId.EXAM_FAVORABLE);
    expect(acknowledge).toHaveBeenCalledTimes(2);
  });

  it('shows the struck condition and no gain line for a badge without credits', async () => {
    const { fixture, store } = await setup();
    store.enqueue([BAPTEME]);
    fixture.detectChanges();

    const card = cardOf(fixture);
    expect(card?.textContent).toContain('Terminer un premier examen blanc');
    expect(card?.querySelector('.cb__strike')).not.toBeNull();
    expect(card?.querySelector('.cb__gain')).toBeNull();
  });

  it('acknowledges every queued badge when closed from the overlay', async () => {
    const { fixture, store, acknowledge } = await setup();
    store.enqueue([BAPTEME, APTE]);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLElement>('.cb__overlay')
      ?.click();
    fixture.detectChanges();

    expect(cardOf(fixture)).toBeNull();
    expect(acknowledge).toHaveBeenCalledTimes(2);
  });
});
