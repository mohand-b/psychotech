import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from '../button/button';
import { ActionFooter } from './action-footer';

@Component({
  imports: [ActionFooter, Button],
  template: `
    <ui-action-footer>
      <ui-button color="brand" relief="mobile" block="mobile"
        >Primaire</ui-button
      >
      <ui-button
        color="neutral"
        appearance="outlined"
        relief="mobile"
        block="mobile"
        >Secondaire</ui-button
      >
    </ui-action-footer>
  `,
})
class Host {}

describe('ActionFooter', () => {
  it('keeps the primary action first and the secondary next, with no slot below', async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const footer = fixture.nativeElement.querySelector(
      'ui-action-footer',
    ) as HTMLElement;
    const actions = footer.querySelector('.action-footer__actions');
    const buttons = Array.from(
      actions?.querySelectorAll('ui-button') ?? [],
    ) as HTMLElement[];

    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent?.trim()).toBe('Primaire');
    expect(buttons[1].textContent?.trim()).toBe('Secondaire');
    expect(footer.querySelector('[actionFooterNote]')).toBe(null);
  });

  it('applies the same mobile relief and mobile block classes to every action', async () => {
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('ui-button'),
    ) as HTMLElement[];

    for (const host of buttons) {
      expect(host.classList.contains('ui-button--block-mobile')).toBe(true);
      const inner = host.querySelector('button') as HTMLElement;
      expect(inner.classList.contains('ui-button--relief-mobile')).toBe(true);
      expect(inner.classList.contains('ui-button--relief')).toBe(false);
    }
  });
});
