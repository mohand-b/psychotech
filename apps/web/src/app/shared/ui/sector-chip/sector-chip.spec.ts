import { TestBed } from '@angular/core/testing';
import { Sector } from '@psychotech/shared';
import { SectorChip } from './sector-chip';

async function setup(sector: Sector) {
  await TestBed.configureTestingModule({
    imports: [SectorChip],
  }).compileComponents();
  const fixture = TestBed.createComponent(SectorChip);
  fixture.componentRef.setInput('sector', sector);
  fixture.detectChanges();
  return fixture;
}

describe('SectorChip', () => {
  it('renders the SECTEUR label above the sector name', async () => {
    const fixture = await setup(Sector.RAILWAY);
    expect(
      fixture.nativeElement.querySelector('.sector__label').textContent,
    ).toBe('Secteur');
    expect(
      fixture.nativeElement.querySelector('.sector__name').textContent.trim(),
    ).toBe('Ferroviaire');
    expect(
      fixture.nativeElement.querySelector('.sector__icon svg'),
    ).not.toBeNull();
  });

  it('follows the user sector dynamically', async () => {
    const fixture = await setup(Sector.AVIATION);
    expect(
      fixture.nativeElement.querySelector('.sector__name').textContent.trim(),
    ).toBe('Aérien');
  });
});
