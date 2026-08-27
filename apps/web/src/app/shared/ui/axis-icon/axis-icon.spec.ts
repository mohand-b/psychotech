import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AxisType } from '@psychotech/shared';
import { AXIS_ICON_SIZE, AxisIcon, AxisIconId } from './axis-icon';

@Component({
  imports: [AxisIcon],
  template: '<ui-axis-icon [axis]="axis" [size]="size" [label]="label" />',
})
class Host {
  axis: AxisIconId = AxisType.LOGIC;
  size: number = AXIS_ICON_SIZE.chip;
  label: string | null = null;
}

async function setup(
  axis: AxisIconId,
  size: number = AXIS_ICON_SIZE.chip,
  label: string | null = null,
) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.axis = axis;
  fixture.componentInstance.size = size;
  fixture.componentInstance.label = label;
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('img') as HTMLImageElement | null;
}

describe('AxisIcon', () => {
  it('maps every playable axis and the exam to its definitive asset', async () => {
    expect((await setup(AxisType.LOGIC))?.getAttribute('src')).toBe(
      '/icons/icone-logique.svg',
    );
    expect((await setup(AxisType.MEMORY))?.getAttribute('src')).toBe(
      '/icons/icone-memoire.svg',
    );
    expect(
      (await setup(AxisType.VISUAL_DISCRIMINATION))?.getAttribute('src'),
    ).toBe('/icons/icone-discrimination.svg');
    expect((await setup(AxisType.REACTIVITY))?.getAttribute('src')).toBe(
      '/icons/icone-reactivite.svg',
    );
    expect((await setup(AxisType.MOTOR_SKILLS))?.getAttribute('src')).toBe(
      '/icons/icone-motricite.svg',
    );
    expect((await setup('examen'))?.getAttribute('src')).toBe(
      '/icons/icone-examen.svg',
    );
    expect((await setup('credit'))?.getAttribute('src')).toBe(
      '/icons/icone-piece.svg',
    );
  });

  it('sets explicit dimensions to avoid any layout shift', async () => {
    const img = await setup(AxisType.LOGIC, AXIS_ICON_SIZE.hero);
    expect(img?.getAttribute('width')).toBe('44');
    expect(img?.getAttribute('height')).toBe('44');
  });

  it('keeps the reactivity bolt at the requested dimensions', async () => {
    const img = await setup(AxisType.REACTIVITY, AXIS_ICON_SIZE.hero);
    expect(img?.getAttribute('width')).toBe('44');
    expect(img?.getAttribute('height')).toBe('44');
  });

  it('stays decorative unless a label is provided', async () => {
    const decorative = await setup(AxisType.LOGIC);
    expect(decorative?.getAttribute('aria-hidden')).toBe('true');
    expect(decorative?.getAttribute('alt')).toBe('');

    const labelled = await setup(AxisType.LOGIC, AXIS_ICON_SIZE.chip, 'Logique');
    expect(labelled?.getAttribute('aria-hidden')).toBeNull();
    expect(labelled?.getAttribute('alt')).toBe('Logique');
  });

  it('maps the four upcoming axes to their definitive assets', async () => {
    expect((await setup(AxisType.ATTENTION))?.getAttribute('src')).toBe(
      '/icons/icone-attention.svg',
    );
    expect((await setup(AxisType.NUMERICAL))?.getAttribute('src')).toBe(
      '/icons/icone-numerique.svg',
    );
    expect((await setup(AxisType.VERBAL))?.getAttribute('src')).toBe(
      '/icons/icone-verbal.svg',
    );
    expect((await setup(AxisType.SPATIAL))?.getAttribute('src')).toBe(
      '/icons/icone-spatial.svg',
    );
  });
});
