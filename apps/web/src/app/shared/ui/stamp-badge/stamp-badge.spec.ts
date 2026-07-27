import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  AxisStamp,
  AxisStampWord,
  SimulationStamp,
  SimulationStampQualifier,
  SimulationVerdict,
} from '@psychotech/shared';
import { StampBadge } from './stamp-badge';

function render(inputs: {
  simulationStamp?: SimulationStamp;
  axisStamp?: AxisStamp;
}): ComponentFixture<StampBadge> {
  const fixture = TestBed.createComponent(StampBadge);
  fixture.componentRef.setInput(
    'simulationStamp',
    inputs.simulationStamp ?? null,
  );
  fixture.componentRef.setInput('axisStamp', inputs.axisStamp ?? null);
  fixture.detectChanges();
  return fixture;
}

function text(fixture: ComponentFixture<StampBadge>, selector: string) {
  return (
    (fixture.nativeElement as HTMLElement)
      .querySelector(selector)
      ?.textContent?.trim() ?? null
  );
}

describe('StampBadge', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StampBadge],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('renders the simulation verdict with its qualifier subline', () => {
    const fixture = render({
      simulationStamp: {
        verdict: SimulationVerdict.FAVORABLE,
        qualifier: SimulationStampQualifier.SOLID,
      },
    });
    expect(text(fixture, '.stamp__main')).toBe('Favorable');
    expect(text(fixture, '.stamp__sub')).toBe('Solide');
    const stamp = fixture.nativeElement.querySelector('.stamp');
    expect(stamp.classList.contains('stamp--unfavorable')).toBe(false);
    expect(stamp.style.getPropertyValue('--stamp-ink')).toBe(
      'var(--rating-good-ink)',
    );
  });

  it('marks an unfavorable simulation stamp with the red ink', () => {
    const fixture = render({
      simulationStamp: {
        verdict: SimulationVerdict.UNFAVORABLE,
        qualifier: SimulationStampQualifier.BORDERLINE,
      },
    });
    expect(text(fixture, '.stamp__main')).toBe('Défavorable');
    expect(text(fixture, '.stamp__sub')).toBe('Limite');
    const stamp = fixture.nativeElement.querySelector('.stamp');
    expect(stamp.classList.contains('stamp--unfavorable')).toBe(true);
    expect(stamp.style.getPropertyValue('--stamp-ink')).toBe(
      'var(--rating-bad-ink)',
    );
  });

  it.each([
    [AxisStampWord.EXCELLENT, 'Excellent', 'var(--rating-good-ink)'],
    [AxisStampWord.SOLID, 'Solide', 'var(--rating-good-ink)'],
    [AxisStampWord.GOOD, 'Bon', 'var(--rating-ok-ink)'],
    [AxisStampWord.FRAGILE, 'Fragile', 'var(--rating-weak-ink)'],
    [AxisStampWord.WEAK, 'Faible', 'var(--rating-bad-ink)'],
  ])(
    'renders the axis word %s without date and with its band ink',
    (word, label, ink) => {
      const fixture = render({ axisStamp: { word, isEliminatory: false } });
      expect(text(fixture, '.stamp__main')).toBe(label);
      expect(fixture.nativeElement.querySelector('.stamp__sub')).toBeNull();
      const stamp = fixture.nativeElement.querySelector('.stamp');
      expect(stamp.style.getPropertyValue('--stamp-ink')).toBe(ink);
      expect(stamp.classList.contains('stamp--eliminatory')).toBe(false);
    },
  );

  it('renders the eliminatory axis stamp in red with its dedicated style', () => {
    const fixture = render({
      axisStamp: { word: AxisStampWord.ELIMINATORY, isEliminatory: true },
    });
    expect(text(fixture, '.stamp__main')).toBe('Éliminatoire');
    const stamp = fixture.nativeElement.querySelector('.stamp');
    expect(stamp.classList.contains('stamp--eliminatory')).toBe(true);
    expect(stamp.style.getPropertyValue('--stamp-ink')).toBe(
      'var(--rating-bad-ink)',
    );
  });
});
