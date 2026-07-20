import { TestBed } from '@angular/core/testing';
import { generateTriangleItem } from '@psychotech/shared';
import { TriangleInput } from './triangle-input';
import { TriangleSeries } from './triangle-series';
import { TriangleTile } from './triangle-tile';

function slotText(element: HTMLElement, slot: string): string {
  return (
    element.querySelector(`[data-slot="${slot}"]`)?.textContent?.trim() ?? ''
  );
}

describe('TriangleTile', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TriangleTile, TriangleSeries, TriangleInput],
    }).compileComponents();
  });

  it('rend les quatre valeurs aux bonnes positions', () => {
    const fixture = TestBed.createComponent(TriangleTile);
    fixture.componentRef.setInput('top', 3);
    fixture.componentRef.setInput('left', 5);
    fixture.componentRef.setInput('right', 2);
    fixture.componentRef.setInput('center', 90);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(slotText(element, 'top')).toBe('3');
    expect(slotText(element, 'left')).toBe('5');
    expect(slotText(element, 'right')).toBe('2');
    expect(slotText(element, 'center')).toBe('90');
    expect(element.querySelectorAll('.value--unknown')).toHaveLength(0);
  });

  it('affiche « ? » au centre comme au sommet', () => {
    const centerFixture = TestBed.createComponent(TriangleTile);
    centerFixture.componentRef.setInput('top', 3);
    centerFixture.componentRef.setInput('left', 5);
    centerFixture.componentRef.setInput('right', 2);
    centerFixture.componentRef.setInput('center', null);
    centerFixture.detectChanges();
    const centerElement: HTMLElement = centerFixture.nativeElement;
    expect(slotText(centerElement, 'center')).toBe('?');
    expect(
      centerElement.querySelector('[data-slot="center"]')?.classList,
    ).toContain('value--unknown');

    const vertexFixture = TestBed.createComponent(TriangleTile);
    vertexFixture.componentRef.setInput('top', null);
    vertexFixture.componentRef.setInput('left', 5);
    vertexFixture.componentRef.setInput('right', 2);
    vertexFixture.componentRef.setInput('center', 6);
    vertexFixture.detectChanges();
    const vertexElement: HTMLElement = vertexFixture.nativeElement;
    expect(slotText(vertexElement, 'top')).toBe('?');
    expect(
      vertexElement.querySelector('[data-slot="top"]')?.classList,
    ).toContain('value--unknown');
    expect(vertexElement.querySelectorAll('.value--unknown')).toHaveLength(1);
  });

  it('pilote la saisie : pavé 0-9 et effacement', () => {
    const fixture = TestBed.createComponent(TriangleInput);
    fixture.componentRef.setInput('value', null);
    fixture.detectChanges();
    const values: (number | null)[] = [];
    fixture.componentInstance.valueChange.subscribe((value) =>
      values.push(value),
    );
    const element: HTMLElement = fixture.nativeElement;
    const keys = element.querySelectorAll<HTMLButtonElement>('.pad__key');
    expect(keys).toHaveLength(10);
    keys[5].click();
    fixture.componentRef.setInput('value', 5);
    fixture.detectChanges();
    keys[2].click();
    fixture.componentRef.setInput('value', 52);
    fixture.detectChanges();
    keys[9].click();
    element.querySelector<HTMLButtonElement>('.pad__clear')?.click();
    expect(values).toEqual([5, 52, null]);
  });

  it('rend une série générée avec son « ? » sur le dernier triangle', () => {
    const item = generateTriangleItem({ level: 5, seed: 'smoke' });
    const fixture = TestBed.createComponent(TriangleSeries);
    fixture.componentRef.setInput('triangles', item.triangles);
    fixture.componentRef.setInput('missing', item.missing);
    fixture.componentRef.setInput('answerValue', null);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('ui-triangle-tile')).toHaveLength(
      item.length,
    );
    expect(element.querySelectorAll('.value--unknown')).toHaveLength(1);
  });
});
