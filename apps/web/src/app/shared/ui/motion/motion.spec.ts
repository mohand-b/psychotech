import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CountUp } from './count-up';
import { MotionOnce, MotionOnceRegistry } from './motion-once';

@Component({
  imports: [CountUp],
  template: `<span [uiCountUp]="value()" [countUpFromZero]="true"></span>`,
})
class CountUpHost {
  readonly value = signal(12);
}

@Component({
  imports: [MotionOnce],
  template: `<div class="motion-rise" [uiMotionOnce]="key"></div>`,
})
class MotionOnceHost {
  key = 'spec-view';
}

describe('CountUp', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('renders the target value and follows changes', async () => {
    await TestBed.configureTestingModule({
      imports: [CountUpHost],
    }).compileComponents();
    const fixture = TestBed.createComponent(CountUpHost);
    fixture.detectChanges();
    const span = fixture.nativeElement.querySelector('span') as HTMLElement;
    expect(span.textContent).toBe('12');

    fixture.componentInstance.value.set(25);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(span.textContent).toBe('25');
  });
});

describe('MotionOnce', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('lets the first appearance play and mutes every later one', async () => {
    await TestBed.configureTestingModule({
      imports: [MotionOnceHost],
    }).compileComponents();

    const first = TestBed.createComponent(MotionOnceHost);
    first.detectChanges();
    const firstDiv = first.nativeElement.querySelector('div') as HTMLElement;
    expect(firstDiv.classList.contains('motion-off')).toBe(false);

    const second = TestBed.createComponent(MotionOnceHost);
    second.detectChanges();
    const secondDiv = second.nativeElement.querySelector('div') as HTMLElement;
    expect(secondDiv.classList.contains('motion-off')).toBe(true);

    expect(TestBed.inject(MotionOnceRegistry).hasPlayed('spec-view')).toBe(true);
  });
});
