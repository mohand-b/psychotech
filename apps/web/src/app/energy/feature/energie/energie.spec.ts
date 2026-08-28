import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { EnergyStateDto } from '@psychotech/shared';
import { of } from 'rxjs';
import { BillingFacade } from '../../data-access/billing.facade';
import { EnergyFacade } from '../../data-access/energy.facade';
import { Energie } from './energie';

function energyState(balance: number): EnergyStateDto {
  return { balance, canStartFull: balance >= 5, canStartAxis: balance >= 1 };
}

async function setup(sessionId: string | null = null) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Energie],
    providers: [
      provideRouter([]),
      {
        provide: EnergyFacade,
        useValue: {
          state: () => energyState(12),
          load: () => of(energyState(12)),
        },
      },
      {
        provide: BillingFacade,
        useValue: {
          createPackCheckout: () => Promise.reject(new Error('not mocked')),
          checkoutStatus: () =>
            of({ status: 'complete' as const, credited: true }),
        },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            paramMap: convertToParamMap({}),
            queryParamMap: convertToParamMap(
              sessionId ? { session_id: sessionId } : {},
            ),
          },
        },
      },
    ],
  }).compileComponents();
  const fixture = TestBed.createComponent(Energie);
  fixture.detectChanges();
  return fixture;
}

describe('Energie', () => {
  it('shows the current balance without any cap', async () => {
    const fixture = await setup();
    const value: HTMLElement =
      fixture.nativeElement.querySelector('.energie__solde-value');
    expect(value.textContent?.trim()).toBe('12');
    expect(fixture.nativeElement.textContent).toContain(
      "Sans date d'expiration",
    );
  });

  it('renders the three one-time packs with the middle one featured', async () => {
    const fixture = await setup();
    const cards = fixture.nativeElement.querySelectorAll('.energie__pack');
    expect(cards).toHaveLength(3);
    const featured = fixture.nativeElement.querySelectorAll(
      '.energie__pack--featured',
    );
    expect(featured).toHaveLength(1);
    expect(featured[0].textContent).toContain("Avant l'examen");
    expect(featured[0].textContent).toContain('Le plus choisi');
    expect(fixture.nativeElement.textContent).toContain('Recharger · 2,90 €');
    expect(fixture.nativeElement.textContent).toContain('Recharger · 7,90 €');
    expect(fixture.nativeElement.textContent).toContain('Recharger · 14,90 €');
  });

  it('shows the reassurance lines of the energy-only model', async () => {
    const fixture = await setup();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain("Vos crédits n'expirent jamais");
    expect(text).toContain('Aucun abonnement, aucune reconduction');
  });

  it('links the badges band to the badges page with the real catalog rewards', async () => {
    const fixture = await setup();
    const link: HTMLAnchorElement | null =
      fixture.nativeElement.querySelector('.energie__badges-link');
    expect(link?.getAttribute('href')).toBe('/badges');
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('+25');
    expect(text).toContain('Sur les rails');
    expect(text).toContain('Premier de la classe');
    expect(text).toContain('Premiers pas');
    expect(text).toContain('+3');
    expect(text).toContain('+2');
    const tiles = fixture.nativeElement.querySelectorAll('.energie__badge-tile');
    expect(tiles).toHaveLength(3);
  });

  it('enters the confirmation view when returning from a checkout', async () => {
    const fixture = await setup('cs_test_1');
    expect(
      fixture.nativeElement.querySelector('.energie__confirmation'),
    ).not.toBeNull();
  });
});
