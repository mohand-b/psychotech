import { TestBed } from '@angular/core/testing';
import { DominoFace, generateDominoItem } from '@psychotech/shared';
import { DominoInput } from './domino-input';
import { DominoSequence } from './domino-sequence';
import { DominoTile } from './domino-tile';

describe('DominoTile', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DominoTile, DominoSequence, DominoInput],
    }).compileComponents();
  });

  it('rend les 7 valeurs de face avec le bon nombre de points', () => {
    for (let face = 0; face <= 6; face += 1) {
      const fixture = TestBed.createComponent(DominoTile);
      fixture.componentRef.setInput('top', face as DominoFace);
      fixture.componentRef.setInput('bottom', 0 as DominoFace);
      fixture.detectChanges();
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelectorAll('.pip--top')).toHaveLength(face);
      expect(element.querySelectorAll('.pip--bottom')).toHaveLength(0);
    }
  });

  it('affiche un point d’interrogation pour une face inconnue', () => {
    const fixture = TestBed.createComponent(DominoTile);
    fixture.componentRef.setInput('top', null);
    fixture.componentRef.setInput('bottom', 3 as DominoFace);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.unknown')).toHaveLength(1);
    expect(element.querySelectorAll('.pip--bottom')).toHaveLength(3);
  });

  it('rend une suite générée avec sa tuile réponse en mystère', () => {
    const item = generateDominoItem({ level: 3, seed: 'smoke' });
    const fixture = TestBed.createComponent(DominoSequence);
    fixture.componentRef.setInput('tiles', item.tiles.slice(0, -1));
    fixture.componentRef.setInput('answerTop', null);
    fixture.componentRef.setInput('answerBottom', null);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('ui-domino-tile')).toHaveLength(
      item.length,
    );
    expect(element.querySelectorAll('.unknown')).toHaveLength(2);
    expect(element.querySelectorAll('.seq__zone')).toHaveLength(2);
  });

  it('pilote la saisie : pavé 0-6 et bascule de face', () => {
    const fixture = TestBed.createComponent(DominoInput);
    fixture.componentRef.setInput('top', null);
    fixture.componentRef.setInput('bottom', null);
    fixture.componentRef.setInput('activeHalf', 'top');
    fixture.detectChanges();
    const faces: DominoFace[] = [];
    const halves: string[] = [];
    fixture.componentInstance.pickFace.subscribe((face) => faces.push(face));
    fixture.componentInstance.pickHalf.subscribe((half) => halves.push(half));
    const element: HTMLElement = fixture.nativeElement;
    const keys = element.querySelectorAll<HTMLButtonElement>('.pad__key');
    expect(keys).toHaveLength(7);
    keys[5].click();
    element.querySelectorAll<HTMLButtonElement>('.pad__half')[1].click();
    expect(faces).toEqual([5]);
    expect(halves).toEqual(['bottom']);
  });
});
