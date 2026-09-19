import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AxisType } from '@psychotech/shared';
import { ResultWait, ResultWaitFailure } from './result-wait';

const SAVED_TITLE = "Le calcul n'a pas abouti.";
const SAVED_LEGEND = "Vos réponses sont bien enregistrées, rien n'est perdu.";
const UNSENT_TITLE = "L'envoi de vos réponses n'a pas abouti.";
const UNSENT_LEGEND =
  'Vos réponses sont conservées sur cette page. Gardez-la ouverte, vérifiez votre connexion, puis réessayez.';
const CLOSED_TITLE = "Cette session n'est plus active.";

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
      failure: ResultWaitFailure | null;
      slow: boolean;
    }> = {},
  ): { fixture: ComponentFixture<ResultWait>; element: HTMLElement } {
    const fixture = TestBed.createComponent(ResultWait);
    fixture.componentRef.setInput('axis', inputs.axis ?? AxisType.LOGIC);
    fixture.componentRef.setInput('simulation', inputs.simulation ?? false);
    fixture.componentRef.setInput('failure', inputs.failure ?? null);
    fixture.componentRef.setInput('slow', inputs.slow ?? false);
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  const text = (element: HTMLElement, selector: string): string =>
    element.querySelector(selector)?.textContent?.trim() ?? '';

  it('renders the targeted loading state with the axis chip and the spinning arc', () => {
    const { element } = create({ axis: AxisType.MEMORY });

    expect(text(element, '.wait__chip')).toBe('Mémoire');
    expect(text(element, '.wait__title')).toBe('Analyse de votre performance');
    expect(element.querySelector('.wait__arc')).not.toBeNull();
    expect(element.querySelector('.wait__actions')).toBeNull();
    expect(element.querySelector('.wait')?.getAttribute('role')).toBe('status');
  });

  it('renders the full session loading state with the brand chip', () => {
    const { element } = create({ simulation: true });

    expect(text(element, '.wait__title')).toBe('Préparation de votre bilan');
    expect(element.querySelector('.wait--failed')).toBeNull();
  });

  it('keeps the reassurance line in the layout and reveals it when slow', () => {
    const { fixture, element } = create();
    const patience = element.querySelector('.wait__patience');
    expect(patience?.classList.contains('wait__patience--visible')).toBe(false);

    fixture.componentRef.setInput('slow', true);
    fixture.detectChanges();

    expect(patience?.classList.contains('wait__patience--visible')).toBe(true);
  });

  it('never claims the answers are saved when the submission itself failed', () => {
    const { element } = create({ failure: 'completion' });

    expect(text(element, '.wait__title')).toBe(UNSENT_TITLE);
    expect(text(element, '.wait__legend')).toBe(UNSENT_LEGEND);
    expect(element.textContent).not.toContain('bien enregistrées');
    expect(text(element, '.wait__quit')).toBe('Quitter sans envoyer');
    expect(element.querySelector('.wait__arc')).toBeNull();
  });

  it('reassures about saved answers only when the result could not be loaded', () => {
    const { element } = create({ failure: 'prefetch' });

    expect(text(element, '.wait__title')).toBe(SAVED_TITLE);
    expect(text(element, '.wait__legend')).toBe(SAVED_LEGEND);
    expect(text(element, '.wait__quit')).toBe('Quitter');
  });

  it('offers only to quit when the session was closed elsewhere', () => {
    const { fixture, element } = create({ failure: 'session-closed' });
    const quit = vi.fn();
    const retry = vi.fn();
    fixture.componentInstance.quit.subscribe(quit);
    fixture.componentInstance.retry.subscribe(retry);

    expect(text(element, '.wait__title')).toBe(CLOSED_TITLE);
    expect(element.querySelector('.wait__quit')).toBeNull();
    expect(text(element, '.wait__retry')).toBe('Quitter');

    element.querySelector<HTMLButtonElement>('.wait__retry')?.click();
    expect(quit).toHaveBeenCalledTimes(1);
    expect(retry).not.toHaveBeenCalled();
  });

  it('emits retry and quit once per click on a retryable failure', () => {
    const { fixture, element } = create({ failure: 'completion' });
    const quit = vi.fn();
    const retry = vi.fn();
    fixture.componentInstance.quit.subscribe(quit);
    fixture.componentInstance.retry.subscribe(retry);

    element.querySelector<HTMLButtonElement>('.wait__retry')?.click();
    element.querySelector<HTMLButtonElement>('.wait__quit')?.click();

    expect(retry).toHaveBeenCalledTimes(1);
    expect(quit).toHaveBeenCalledTimes(1);
  });

  it('announces a failure assertively and moves the focus into the screen without arming any action', async () => {
    const { fixture, element } = create({ failure: 'completion' });
    await fixture.whenStable();

    expect(element.querySelector('.wait')?.getAttribute('role')).toBe('alert');
    expect(document.activeElement).toBe(element.querySelector('.wait'));
  });
});
