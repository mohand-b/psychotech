import { TestBed } from '@angular/core/testing';
import { AxisType } from '@psychotech/shared';
import { AxisCountdown } from './axis-countdown';

describe('AxisCountdown', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [AxisCountdown],
    }).compileComponents();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function create(axis: AxisType = AxisType.LOGIC) {
    const fixture = TestBed.createComponent(AxisCountdown);
    fixture.componentRef.setInput('axis', axis);
    const finished = vi.fn();
    fixture.componentInstance.finished.subscribe(finished);
    fixture.detectChanges();
    return { fixture, finished };
  }

  it('counts three, two, one then finishes exactly once', () => {
    const { fixture, finished } = create();
    expect(fixture.nativeElement.textContent).toContain('3');
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2');
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('1');
    expect(finished).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(finished).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(finished).toHaveBeenCalledTimes(1);
  });

  it('skips immediately and never fires again', () => {
    const { fixture, finished } = create();
    const skip = fixture.nativeElement.querySelector(
      '.countdown__skip',
    ) as HTMLButtonElement;
    skip.click();
    expect(finished).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(finished).toHaveBeenCalledTimes(1);
  });
});
