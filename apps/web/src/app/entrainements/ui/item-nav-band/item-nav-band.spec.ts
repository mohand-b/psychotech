import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AxisType } from '@psychotech/shared';
import { beforeEach, describe, expect, it } from 'vitest';
import { ItemNavBand, ItemNavState } from './item-nav-band';

const CLOCK_PATTERN = /\d{1,2}\s*:\s*\d{2}/;

@Component({
  imports: [ItemNavBand],
  template: `<ui-item-nav-band
    [states]="states()"
    [currentIndex]="0"
    [axis]="axis"
    [remainingCount]="states().length"
  />`,
})
class BandHost {
  readonly axis = AxisType.LOGIC;
  readonly states = signal<ItemNavState[]>([
    'answered',
    'pending',
    'pending',
    'skipped',
  ]);
}

describe('ItemNavBand', () => {
  let fixture: ComponentFixture<BandHost>;

  beforeEach(async () => {
    Element.prototype.scrollIntoView = () => undefined;
    await TestBed.configureTestingModule({ imports: [BandHost] })
      .compileComponents();
    fixture = TestBed.createComponent(BandHost);
    fixture.detectChanges();
  });

  it('gives every item its own control', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('button').length).toBe(4);
  });

  it('never shows a clock, the session timer belongs to the header alone', () => {
    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent ?? '').not.toMatch(CLOCK_PATTERN);
  });
});
