import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Button } from './button';

async function render(
  inputs: Partial<{
    color: string;
    appearance: string;
    size: string;
    relief: boolean | 'mobile';
    block: boolean | 'mobile';
    disabled: boolean;
    loading: boolean;
  }> = {},
): Promise<ComponentFixture<Button>> {
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [Button],
  }).compileComponents();
  const fixture = TestBed.createComponent(Button);
  for (const [name, value] of Object.entries(inputs)) {
    fixture.componentRef.setInput(name, value);
  }
  fixture.detectChanges();
  return fixture;
}

function inner(fixture: ComponentFixture<Button>): HTMLButtonElement {
  return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
}

describe('Button', () => {
  it('composes the class list from colour, appearance and size', async () => {
    const fixture = await render({
      color: 'reactivity',
      appearance: 'outlined',
      size: 'lg',
    });

    expect(inner(fixture).className.split(' ')).toEqual(
      expect.arrayContaining([
        'ui-button',
        'ui-button--reactivity',
        'ui-button--outlined',
        'ui-button--lg',
      ]),
    );
  });

  it.each([
    [true, 'ui-button--relief', 'ui-button--relief-mobile'],
    ['mobile' as const, 'ui-button--relief-mobile', 'ui-button--relief'],
  ])('maps relief %s to %s only', async (relief, expected, absent) => {
    const fixture = await render({ relief });
    const element = inner(fixture);

    expect(element.classList.contains(expected)).toBe(true);
    expect(element.classList.contains(absent)).toBe(false);
  });

  it('carries no relief class by default', async () => {
    const element = inner(await render());

    expect(element.className).not.toContain('relief');
  });

  it.each([
    [true, 'ui-button--block', 'ui-button--block-mobile'],
    ['mobile' as const, 'ui-button--block-mobile', 'ui-button--block'],
  ])(
    'maps block %s to the host class %s only',
    async (block, expected, absent) => {
      const fixture = await render({ block });
      const host = fixture.nativeElement as HTMLElement;

      expect(host.classList.contains(expected)).toBe(true);
      expect(host.classList.contains(absent)).toBe(false);
    },
  );

  it('disables the inner button while loading', async () => {
    const fixture = await render({ loading: true });
    const element = inner(fixture);

    expect(element.disabled).toBe(true);
    expect(element.classList.contains('ui-button--loading')).toBe(true);
    expect(
      fixture.nativeElement.querySelector('.ui-button__spinner'),
    ).not.toBeNull();
  });
});
