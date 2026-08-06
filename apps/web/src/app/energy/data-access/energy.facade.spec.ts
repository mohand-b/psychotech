import { WritableSignal, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EnergyStateDto, UserProfileDto } from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { EnergyApi } from './energy.api';
import { EnergyFacade } from './energy.facade';

function energyState(balance: number): EnergyStateDto {
  return {
    balance,
    capacity: 5,
    resetsAt: '2026-07-26T22:00:00.000Z',
    canStartFull: balance >= 5,
    canStartAxis: balance >= 1,
  };
}

describe('EnergyFacade — synchronisation avec la session utilisateur', () => {
  let currentUser: WritableSignal<UserProfileDto | null>;
  let stateApi: ReturnType<typeof vi.fn>;

  function setup(initialUserId: string | null): EnergyFacade {
    currentUser = signal<UserProfileDto | null>(
      initialUserId === null
        ? null
        : ({ id: initialUserId } as UserProfileDto),
    );
    stateApi = vi.fn(() => of(energyState(5)));
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthFacade, useValue: { currentUser } },
        { provide: EnergyApi, useValue: { state: stateApi } },
      ],
    });
    return TestBed.inject(EnergyFacade);
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('charge l’état à la connexion de l’utilisateur, sans reload', () => {
    const facade = setup(null);
    TestBed.tick();
    expect(stateApi).not.toHaveBeenCalled();
    expect(facade.state()).toBeNull();

    currentUser.set({ id: 'user-1' } as UserProfileDto);
    TestBed.tick();

    expect(stateApi).toHaveBeenCalledTimes(1);
    expect(facade.state()?.balance).toBe(5);
  });

  it('recharge l’état quand un autre utilisateur se connecte', () => {
    const facade = setup('user-1');
    TestBed.tick();
    expect(stateApi).toHaveBeenCalledTimes(1);

    currentUser.set({ id: 'user-2' } as UserProfileDto);
    TestBed.tick();

    expect(stateApi).toHaveBeenCalledTimes(2);
    expect(facade.state()).not.toBeNull();
  });

  it('vide l’état quand l’utilisateur se déconnecte', () => {
    const facade = setup('user-1');
    TestBed.tick();
    expect(facade.state()).not.toBeNull();

    currentUser.set(null);
    TestBed.tick();

    expect(facade.state()).toBeNull();
    expect(stateApi).toHaveBeenCalledTimes(1);
  });
});
