import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AxisType, FULL_SESSION_AXIS_ORDER } from '@psychotech/shared';
import {
  ChevronStep,
  ChevronStepper,
  ChevronStepperMode,
  ChevronStepperVariant,
} from './chevron-stepper';

interface RenderOptions {
  mode?: ChevronStepperMode;
  variant?: ChevronStepperVariant;
  currentIndex?: number;
  steps?: readonly ChevronStep[];
}

function render(options: RenderOptions = {}): ComponentFixture<ChevronStepper> {
  const fixture = TestBed.createComponent(ChevronStepper);
  fixture.componentRef.setInput('mode', options.mode ?? 'progress');
  fixture.componentRef.setInput('variant', options.variant ?? 'full');
  fixture.componentRef.setInput('axes', FULL_SESSION_AXIS_ORDER);
  fixture.componentRef.setInput('currentIndex', options.currentIndex ?? 0);
  fixture.componentRef.setInput('steps', options.steps ?? []);
  fixture.detectChanges();
  return fixture;
}

function stepElements(
  fixture: ComponentFixture<ChevronStepper>,
): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.step'));
}

function numbers(fixture: ComponentFixture<ChevronStepper>): string[] {
  return Array.from(
    fixture.nativeElement.querySelectorAll('.step__number'),
  ).map((node) => (node as HTMLElement).textContent?.trim() ?? '');
}

function labels(fixture: ComponentFixture<ChevronStepper>): string[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.step__label')).map(
    (node) => (node as HTMLElement).textContent?.trim() ?? '',
  );
}

function activeIndexOf(fixture: ComponentFixture<ChevronStepper>): number {
  return stepElements(fixture).findIndex((step) =>
    step.classList.contains('step--active'),
  );
}

function selectedIndexOf(fixture: ComponentFixture<ChevronStepper>): number {
  return stepElements(fixture).findIndex(
    (step) => step.getAttribute('aria-current') === 'true',
  );
}

describe('ChevronStepper', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChevronStepper],
    }).compileComponents();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  describe('mode progression', () => {
    it('derives done, current and todo states from currentIndex', () => {
      const fixture = render({ currentIndex: 2 });
      const steps = stepElements(fixture);
      expect(steps).toHaveLength(5);
      expect(steps[0].classList.contains('step--done')).toBe(true);
      expect(steps[1].classList.contains('step--done')).toBe(true);
      expect(steps[2].classList.contains('step--current')).toBe(true);
      expect(steps[2].getAttribute('aria-current')).toBe('step');
      expect(steps[3].classList.contains('step--todo')).toBe(true);
      expect(steps[4].classList.contains('step--todo')).toBe(true);
    });

    it('renders non-interactive steps without selection behavior', () => {
      const fixture = render({ currentIndex: 1 });
      expect(
        fixture.nativeElement.querySelectorAll('button.step'),
      ).toHaveLength(0);
      expect(activeIndexOf(fixture)).toBe(-1);
    });

    it('honors an explicit steps input', () => {
      const fixture = render({
        steps: [
          { axis: AxisType.LOGIC, state: 'plain' },
          { axis: AxisType.MEMORY, state: 'done' },
        ],
      });
      const steps = stepElements(fixture);
      expect(steps).toHaveLength(2);
      expect(steps[1].classList.contains('step--done')).toBe(true);
    });

    it('numbers every step from 01, in full and in mini', () => {
      expect(numbers(render())).toEqual(['01', '02', '03', '04', '05']);
      TestBed.resetTestingModule();
      expect(numbers(render({ variant: 'mini' }))).toEqual([
        '01',
        '02',
        '03',
        '04',
        '05',
      ]);
    });

    it('mini hides only the axis name, keeping number and icon', () => {
      const fixture = render({ variant: 'mini', currentIndex: 2 });
      expect(labels(fixture)).toEqual([]);
      expect(numbers(fixture)).toHaveLength(5);
      expect(fixture.nativeElement.querySelectorAll('ui-icon')).toHaveLength(5);
      expect(stepElements(fixture)[0].getAttribute('aria-label')).toBe(
        'Logique',
      );
    });

    it('full shows the axis names', () => {
      expect(labels(render())).toEqual([
        'Logique',
        'Mémoire',
        'Discrimination',
        'Réactivité',
        'Motricité',
      ]);
    });
  });

  describe('mode explorateur', () => {
    it('renders buttons without any progression state and selects the first axis by default', () => {
      const fixture = render({ mode: 'explorer' });
      const steps = stepElements(fixture);
      expect(steps).toHaveLength(5);
      expect(
        fixture.nativeElement.querySelectorAll('button.step'),
      ).toHaveLength(5);
      expect(
        steps.some(
          (step) =>
            step.classList.contains('step--done') ||
            step.classList.contains('step--current') ||
            step.classList.contains('step--todo'),
        ),
      ).toBe(false);
      expect(selectedIndexOf(fixture)).toBe(0);
      expect(activeIndexOf(fixture)).toBe(0);
      expect(steps[0].tabIndex).toBe(0);
      expect(steps[1].tabIndex).toBe(-1);
    });

    it('previews on hover then reverts to the persistent selection', () => {
      const fixture = render({ mode: 'explorer' });
      const emitted: AxisType[] = [];
      fixture.componentInstance.activeAxisChange.subscribe((axis) =>
        emitted.push(axis),
      );
      const steps = stepElements(fixture);

      steps[3].dispatchEvent(new Event('pointerenter'));
      fixture.detectChanges();
      expect(activeIndexOf(fixture)).toBe(3);
      expect(selectedIndexOf(fixture)).toBe(0);
      expect(emitted.at(-1)).toBe(FULL_SESSION_AXIS_ORDER[3]);

      steps[3].dispatchEvent(new Event('pointerleave'));
      fixture.detectChanges();
      expect(activeIndexOf(fixture)).toBe(0);
      expect(emitted.at(-1)).toBe(FULL_SESSION_AXIS_ORDER[0]);
    });

    it('persists the selection on click', () => {
      const fixture = render({ mode: 'explorer' });
      const steps = stepElements(fixture);

      steps[2].dispatchEvent(new Event('pointerenter'));
      steps[2].click();
      fixture.detectChanges();
      expect(selectedIndexOf(fixture)).toBe(2);

      steps[2].dispatchEvent(new Event('pointerleave'));
      fixture.detectChanges();
      expect(activeIndexOf(fixture)).toBe(2);
      expect(selectedIndexOf(fixture)).toBe(2);
    });

    it('moves the selection with arrow keys, clamped at both ends, and moves focus', () => {
      const fixture = render({ mode: 'explorer' });
      const steps = stepElements(fixture);

      steps[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
      );
      fixture.detectChanges();
      expect(selectedIndexOf(fixture)).toBe(1);
      expect(document.activeElement).toBe(steps[1]);

      steps[1].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      fixture.detectChanges();
      expect(selectedIndexOf(fixture)).toBe(0);

      steps[0].dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }),
      );
      fixture.detectChanges();
      expect(selectedIndexOf(fixture)).toBe(0);
    });

    it('emits the default axis initially', () => {
      const fixture = TestBed.createComponent(ChevronStepper);
      const emitted: AxisType[] = [];
      fixture.componentInstance.activeAxisChange.subscribe((axis) =>
        emitted.push(axis),
      );
      fixture.componentRef.setInput('mode', 'explorer');
      fixture.componentRef.setInput('axes', FULL_SESSION_AXIS_ORDER);
      fixture.detectChanges();
      expect(emitted).toEqual([FULL_SESSION_AXIS_ORDER[0]]);
    });

    it('keeps the numbers in explorer mode, full and mini', () => {
      expect(numbers(render({ mode: 'explorer' }))).toEqual([
        '01',
        '02',
        '03',
        '04',
        '05',
      ]);
      TestBed.resetTestingModule();
      const mini = render({ mode: 'explorer', variant: 'mini' });
      expect(numbers(mini)).toHaveLength(5);
      expect(labels(mini)).toEqual([]);
    });
  });
});
