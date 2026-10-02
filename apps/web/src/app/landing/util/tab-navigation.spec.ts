import { tabIndexAfterKey } from './tab-navigation';

const TAB_COUNT = 5;

describe('tabIndexAfterKey', () => {
  it('moves to the next tab and wraps after the last one', () => {
    expect(tabIndexAfterKey('ArrowRight', 1, TAB_COUNT)).toBe(2);
    expect(tabIndexAfterKey('ArrowRight', 4, TAB_COUNT)).toBe(0);
  });

  it('moves to the previous tab and wraps before the first one', () => {
    expect(tabIndexAfterKey('ArrowLeft', 3, TAB_COUNT)).toBe(2);
    expect(tabIndexAfterKey('ArrowLeft', 0, TAB_COUNT)).toBe(4);
  });

  it('jumps to the first and last tabs', () => {
    expect(tabIndexAfterKey('Home', 3, TAB_COUNT)).toBe(0);
    expect(tabIndexAfterKey('End', 1, TAB_COUNT)).toBe(4);
  });

  it('ignores every other key', () => {
    expect(tabIndexAfterKey('Enter', 2, TAB_COUNT)).toBeNull();
    expect(tabIndexAfterKey('ArrowDown', 2, TAB_COUNT)).toBeNull();
  });
});
