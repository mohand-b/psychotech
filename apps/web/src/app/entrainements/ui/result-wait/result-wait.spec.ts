import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AxisType } from '@psychotech/shared';
import { ResultWait } from './result-wait';

describe('ResultWait', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResultWait],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function create(
    inputs: Partial<{
      axis: AxisType;
      simulation: boolean;
      failed: boolean;
      slow: boolean;
    }> = {},
  ): { fixture: ComponentFixture<ResultWait>; element: HTMLElement } {
    const fixture = TestBed.createComponent(ResultWait);
    fixture.componentRef.setInput('axis', inputs.axis ?? AxisType.LOGIC);
    fixture.componentRef.setInput('simulation', inputs.simulation ?? false);
    fixture.componentRef.setInput('failed', inputs.failed ?? false);
    fixture.componentRef.setInput('slow', inputs.slow ?? false);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('renders the targeted loading state with the axis chip and the spinning arc', () => {
    const { element } = create();
    expect(element.querySelector('.wait__chip')?.textContent).toContain(
      'Logique',
    );
    expect(element.textContent).toContain('Analyse de votre performance');
    expect(element.textContent).toContain(
      "Vos réponses sont en cours d'évaluation.",
    );
    expect(element.querySelector('.wait__arc')).not.toBeNull();
    expect(element.querySelector('.wait__retry')).toBeNull();
  });

  it('renders the simulation loading state with the brand chip', () => {
    const { element } = create({ simulation: true });
    expect(element.querySelector('.wait__chip')?.textContent).toContain(
      'Simulation complète',
    );
    expect(element.textContent).toContain('Préparation de votre bilan');
    expect(element.textContent).toContain(
      'Les 5 axes sont en cours de consolidation.',
    );
  });

  it('keeps the reassurance line in the layout and reveals it when slow', () => {
    const { fixture, element } = create();
    const patience = element.querySelector('.wait__patience');
    expect(patience).not.toBeNull();
    expect(patience?.classList).not.toContain('wait__patience--visible');

    fixture.componentRef.setInput('slow', true);
    fixture.detectChanges();
    expect(
      element.querySelector('.wait__patience')?.classList,
    ).toContain('wait__patience--visible');
  });

  it('renders the error state without arc and emits retry once per click', () => {
    const { fixture, element } = create({ failed: true });
    expect(element.textContent).toContain("Le calcul n'a pas abouti.");
    expect(element.textContent).toContain(
      "Vos réponses sont bien enregistrées, rien n'est perdu.",
    );
    expect(element.querySelector('.wait__arc')).toBeNull();
    expect(element.querySelector('.wait__patience')).toBeNull();

    const retries = vi.fn();
    fixture.componentInstance.retry.subscribe(retries);
    (element.querySelector('.wait__retry') as HTMLButtonElement).click();
    expect(retries).toHaveBeenCalledTimes(1);
  });
});
