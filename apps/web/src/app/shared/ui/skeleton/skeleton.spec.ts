import { TestBed } from '@angular/core/testing';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('renders an aria-hidden shimmer that turns static under reduced motion', async () => {
    await TestBed.configureTestingModule({
      imports: [Skeleton],
    }).compileComponents();
    const fixture = TestBed.createComponent(Skeleton);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).getAttribute('aria-hidden'),
    ).toBe('true');

    const styles = Array.from(document.querySelectorAll('style'))
      .map((style) => style.textContent ?? '')
      .join('');
    expect(styles).toContain('ui-skeleton-shimmer');
    expect(styles).toContain('prefers-reduced-motion');
  });
});
