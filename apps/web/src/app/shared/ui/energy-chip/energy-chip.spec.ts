import { TestBed } from '@angular/core/testing';
import { EnergyStateDto } from '@psychotech/shared';
import { EnergyChip } from './energy-chip';

function buildState(overrides: Partial<EnergyStateDto> = {}): EnergyStateDto {
  return {
    balance: 5,
    canStartFull: true,
    canStartAxis: true,
    ...overrides,
  };
}

async function setup(
  state: EnergyStateDto | null,
  requiredCost: number | null = null,
) {
  await TestBed.configureTestingModule({
    imports: [EnergyChip],
  }).compileComponents();
  const fixture = TestBed.createComponent(EnergyChip);
  fixture.componentRef.setInput('state', state);
  fixture.componentRef.setInput('requiredCost', requiredCost);
  fixture.detectChanges();
  return fixture;
}

describe('EnergyChip', () => {
  it('renders the balance alone, without any maximum suffix', async () => {
    const fixture = await setup(buildState({ balance: 37 }));
    const value = fixture.nativeElement.querySelector('.chip__value');
    expect(value.textContent).toBe('37');
    expect(fixture.nativeElement.querySelector('.chip__max')).toBeNull();
  });

  it('stays active while the balance is above zero', async () => {
    const fixture = await setup(buildState({ balance: 1 }));
    const chip = fixture.nativeElement.querySelector('.chip');
    expect(chip.classList.contains('chip--depleted')).toBe(false);
  });

  it('switches to the depleted state at zero', async () => {
    const fixture = await setup(buildState({ balance: 0 }));
    const chip = fixture.nativeElement.querySelector('.chip');
    expect(chip.classList.contains('chip--depleted')).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.chip__value').textContent,
    ).toBe('0');
  });

  it('flags the shortage when the required cost exceeds the balance', async () => {
    const fixture = await setup(buildState({ balance: 2 }), 5);
    const chip = fixture.nativeElement.querySelector('.chip');
    expect(chip.classList.contains('chip--short')).toBe(true);

    TestBed.resetTestingModule();
    const enough = await setup(buildState({ balance: 5 }), 5);
    expect(
      enough.nativeElement
        .querySelector('.chip')
        .classList.contains('chip--short'),
    ).toBe(false);
  });
});
