import { findIndexNearestToMiddle } from './viewport-focus';

const VIEWPORT = { top: 0, bottom: 900 };

function span(top: number, height = 400) {
  return { top, bottom: top + height };
}

describe('findIndexNearestToMiddle', () => {
  it('picks the block whose center is closest to the middle of the viewport', () => {
    const spans = [span(-500), span(-100), span(300), span(700)];
    expect(findIndexNearestToMiddle(spans, VIEWPORT, 0)).toBe(2);
  });

  it('aims at the middle of the band left uncovered below a sticky element', () => {
    const spans = [span(100), span(500)];
    expect(findIndexNearestToMiddle(spans, VIEWPORT, 0)).toBe(0);
    expect(findIndexNearestToMiddle(spans, { top: 400, bottom: 900 }, 0)).toBe(
      1,
    );
  });

  it('keeps the first block while the whole list is still below the fold', () => {
    const spans = [span(1200), span(1600), span(2000)];
    expect(findIndexNearestToMiddle(spans, VIEWPORT, 0)).toBe(0);
  });

  it('settles on the last block once the list has scrolled past', () => {
    const spans = [span(-2000), span(-1600), span(-1200)];
    expect(findIndexNearestToMiddle(spans, VIEWPORT, 0)).toBe(2);
  });

  it('prefers the earlier block on an exact tie', () => {
    const spans = [span(50), span(450)];
    expect(findIndexNearestToMiddle(spans, VIEWPORT, 1)).toBe(0);
  });

  it('falls back to the current index when there is nothing to measure', () => {
    expect(findIndexNearestToMiddle([], VIEWPORT, 3)).toBe(3);
  });
});
