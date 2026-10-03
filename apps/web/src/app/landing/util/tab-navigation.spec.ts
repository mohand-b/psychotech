import { computeTabIndexAfterKey } from './tab-navigation';

const TAB_COUNT = 5;

describe('computeTabIndexAfterKey', () => {
  it('moves to the next tab and wraps after the last one', () => {
    expect(computeTabIndexAfterKey('ArrowRight', 1, TAB_COUNT)).toBe(2);
    expect(computeTabIndexAfterKey('ArrowRight', 4, TAB_COUNT)).toBe(0);
  });

  it('moves to the previous tab and wraps before the first one', () => {
    expect(computeTabIndexAfterKey('ArrowLeft', 3, TAB_COUNT)).toBe(2);
    expect(computeTabIndexAfterKey('ArrowLeft', 0, TAB_COUNT)).toBe(4);
  });

  it('jumps to the first and last tabs', () => {
    expect(computeTabIndexAfterKey('Home', 3, TAB_COUNT)).toBe(0);
    expect(computeTabIndexAfterKey('End', 1, TAB_COUNT)).toBe(4);
  });

  it('ignores every other key', () => {
    expect(computeTabIndexAfterKey('Enter', 2, TAB_COUNT)).toBeNull();
    expect(computeTabIndexAfterKey('ArrowDown', 2, TAB_COUNT)).toBeNull();
  });
});
