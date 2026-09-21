import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EnergyStateDto, UserProfileDto } from '@psychotech/shared';
import { of } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { HybridHeader } from './hybrid-header';

@Component({
  imports: [HybridHeader],
  template: `
    <app-hybrid-header mobileTitle="Nouveautés">
      <span class="projected">Onglets</span>
    </app-hybrid-header>
  `,
})
class Host {}

describe('HybridHeader', () => {
  let fixture: ComponentFixture<Host>;
  let loadEnergy: ReturnType<typeof vi.fn>;

  async function setup(authenticated: boolean): Promise<HTMLElement> {
    loadEnergy = vi.fn(() => of(null));
    await TestBed.configureTestingModule({
      imports: [Host],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            isAuthenticated: signal(authenticated),
            currentUser: signal(
              authenticated
                ? ({
                    firstName: 'Camille',
                    lastName: 'Essai',
                  } as UserProfileDto)
                : null,
            ),
            logout: vi.fn(() => of(undefined)),
          },
        },
        {
          provide: EnergyFacade,
          useValue: {
            state: signal<EnergyStateDto | null>(null),
            load: loadEnergy,
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    TestBed.tick();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('montre l’en-tête public et le retour au site à un visiteur sans compte', async () => {
    const host = await setup(false);

    expect(host.querySelector('ui-navbar')).toBeNull();
    expect(host.querySelector('.public-header__login')?.textContent).toContain(
      'Se connecter',
    );
    expect(
      host.querySelector('.mobile-header__back')?.getAttribute('href'),
    ).toBe('/');
    expect(loadEnergy).not.toHaveBeenCalled();
  });

  it('montre la barre de navigation et charge les crédits d’un utilisateur connecté', async () => {
    const host = await setup(true);

    expect(host.querySelector('ui-navbar')).not.toBeNull();
    expect(host.querySelector('.public-header')).toBeNull();
    expect(
      host.querySelector('.mobile-header__back')?.getAttribute('href'),
    ).toBe('/profil');
    expect(loadEnergy).toHaveBeenCalledTimes(1);
  });

  it('affiche le titre mobile et projette le contenu sous la barre', async () => {
    const host = await setup(false);

    expect(host.querySelector('.mobile-header__title')?.textContent).toBe(
      'Nouveautés',
    );
    expect(host.querySelector('.mobile-header .projected')).not.toBeNull();
  });
});
