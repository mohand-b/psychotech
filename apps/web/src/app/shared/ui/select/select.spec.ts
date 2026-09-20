import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Select, SelectOption } from './select';

type Fruit = 'apple' | 'banana' | 'cherry';

@Component({
  imports: [Select],
  template: `
    <span id="fruit-label">Fruit</span>
    <ui-select
      labelledBy="fruit-label"
      placeholder="Choisir"
      [options]="options"
      [disabled]="disabled()"
      [(value)]="value"
      [(touched)]="touched"
    />
    <button type="button" class="outside">Ailleurs</button>
  `,
})
class Host {
  readonly options: SelectOption<Fruit>[] = [
    { value: 'apple', label: 'Pomme' },
    { value: 'banana', label: 'Banane' },
    { value: 'cherry', label: 'Cerise' },
  ];
  readonly value = signal<Fruit | ''>('');
  readonly touched = signal(false);
  readonly disabled = signal(false);
}

describe('Select', () => {
  let fixture: ComponentFixture<Host>;
  let host: HTMLElement;

  beforeEach(async () => {
    Element.prototype.scrollIntoView = vi.fn();
    await TestBed.configureTestingModule({
      imports: [Host],
    }).compileComponents();
    fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function trigger(): HTMLButtonElement {
    return host.querySelector('[role=combobox]') as HTMLButtonElement;
  }

  function options(): HTMLElement[] {
    return Array.from(host.querySelectorAll('[role=option]'));
  }

  function press(key: string): void {
    trigger().dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
  }

  function click(element: HTMLElement): void {
    element.click();
    fixture.detectChanges();
  }

  it('affiche le placeholder et reste fermé au départ', () => {
    expect(trigger().textContent?.trim()).toBe('Choisir');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-labelledby')).toBe('fruit-label');
    expect(host.querySelector('[role=listbox]')).toBeNull();
  });

  it('ouvre la liste au clic et choisit une option à la souris', () => {
    click(trigger());
    expect(options().map((option) => option.textContent?.trim())).toEqual([
      'Pomme',
      'Banane',
      'Cerise',
    ]);

    click(options()[1]);
    expect(fixture.componentInstance.value()).toBe('banana');
    expect(trigger().textContent?.trim()).toBe('Banane');
    expect(host.querySelector('[role=listbox]')).toBeNull();
    expect(fixture.componentInstance.touched()).toBe(true);
  });

  it('se pilote entièrement au clavier', () => {
    press('ArrowDown');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    press('ArrowDown');
    press('ArrowDown');
    press('ArrowDown');
    expect(trigger().getAttribute('aria-activedescendant')).toBe(
      options()[2].id,
    );

    press('Home');
    press('Enter');
    expect(fixture.componentInstance.value()).toBe('apple');

    press('Enter');
    press('End');
    press('Escape');
    expect(host.querySelector('[role=listbox]')).toBeNull();
    expect(fixture.componentInstance.value()).toBe('apple');
  });

  it('rouvre sur l’option déjà choisie et la marque sélectionnée', () => {
    fixture.componentInstance.value.set('cherry');
    fixture.detectChanges();
    click(trigger());

    const chosen = options()[2];
    expect(chosen.getAttribute('aria-selected')).toBe('true');
    expect(chosen.classList.contains('ui-select__option--active')).toBe(true);
  });

  it('saute à l’option qui commence par la lettre tapée', () => {
    press('c');
    expect(fixture.componentInstance.value()).toBe('cherry');
    expect(host.querySelector('[role=listbox]')).toBeNull();
  });

  it('ignore les faux mouvements de souris qui écraseraient la navigation clavier', () => {
    click(trigger());
    press('ArrowDown');
    options()[0].dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        movementX: 0,
        movementY: 0,
      }),
    );
    fixture.detectChanges();
    press('Enter');

    expect(fixture.componentInstance.value()).toBe('banana');
  });

  it('se ferme au clic extérieur et à la perte de focus', () => {
    click(trigger());
    (host.querySelector('.outside') as HTMLElement).dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    );
    fixture.detectChanges();
    expect(host.querySelector('[role=listbox]')).toBeNull();

    click(trigger());
    trigger().dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(host.querySelector('[role=listbox]')).toBeNull();
  });

  it('ne s’ouvre pas quand il est désactivé', () => {
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    click(trigger());

    expect(trigger().disabled).toBe(true);
    expect(host.querySelector('[role=listbox]')).toBeNull();
  });
});
