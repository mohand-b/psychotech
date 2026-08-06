import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AxisType } from '@psychotech/shared';
import { AppIcon, AppIconGlyph } from './app-icon';

@Component({
  imports: [AppIcon],
  template: '<ui-app-icon [glyph]="glyph" [size]="size" />',
})
class Host {
  glyph: AppIconGlyph = AxisType.LOGIC;
  size: number | null = null;
}

async function setup(glyph: AppIconGlyph, size: number | null = null) {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({ imports: [Host] }).compileComponents();
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.glyph = glyph;
  fixture.componentInstance.size = size;
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('ui-app-icon') as HTMLElement;
}

describe('AppIcon', () => {
  it('maps each playable axis to its asset class', async () => {
    expect((await setup(AxisType.LOGIC)).classList).toContain(
      'app-icon--logique',
    );
    expect((await setup(AxisType.MEMORY)).classList).toContain(
      'app-icon--memoire',
    );
    expect((await setup(AxisType.VISUAL_DISCRIMINATION)).classList).toContain(
      'app-icon--discrimination',
    );
    expect((await setup(AxisType.REACTIVITY)).classList).toContain(
      'app-icon--reactivite',
    );
    expect((await setup(AxisType.MOTOR_SKILLS)).classList).toContain(
      'app-icon--motricite',
    );
  });

  it('maps the exam glyph to the exam asset class', async () => {
    expect((await setup('examen')).classList).toContain('app-icon--examen');
  });

  it('applies an explicit pixel size when provided', async () => {
    const host = await setup(AxisType.LOGIC, 26);
    expect(host.style.width).toBe('26px');
    expect(host.style.height).toBe('26px');
  });
});
