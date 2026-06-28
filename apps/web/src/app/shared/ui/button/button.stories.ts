import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { Button } from './button';

type ButtonStoryArgs = Button & { label: string };

const meta: Meta<ButtonStoryArgs> = {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Button] })],
  argTypes: {
    color: {
      control: { type: 'select' },
      options: [
        'brand',
        'green',
        'neutral',
        'logic',
        'memory',
        'discrimination',
        'reactivity',
        'motor',
      ],
    },
    appearance: {
      control: { type: 'inline-radio' },
      options: ['solid', 'outlined'],
    },
    size: {
      control: { type: 'inline-radio' },
      options: ['md', 'lg'],
    },
    relief: { control: 'boolean' },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    showArrow: { control: 'boolean' },
    icon: { control: false },
    label: { control: 'text' },
  },
  args: {
    color: 'brand',
    appearance: 'solid',
    size: 'md',
    relief: false,
    disabled: false,
    loading: false,
    showArrow: false,
    label: 'Créer un compte',
  },
  render: (args) => ({
    props: args,
    template: `<ui-button [color]="color" [appearance]="appearance" [size]="size" [relief]="relief" [disabled]="disabled" [loading]="loading" [showArrow]="showArrow">{{ label }}</ui-button>`,
  }),
};
export default meta;

type Story = StoryObj<ButtonStoryArgs>;

export const Brand: Story = {};
export const Green: Story = {
  args: { color: 'green', label: 'Lancer la simulation' },
};
export const Outlined: Story = {
  args: { color: 'neutral', appearance: 'outlined', label: 'Voir le détail' },
};
export const Relief: Story = {
  args: { relief: true, label: 'Lancer la session' },
};
export const ReliefGreen: Story = {
  args: { color: 'green', relief: true, label: "Valider l'exercice" },
};
export const OutlinedColored: Story = {
  args: { color: 'logic', appearance: 'outlined', label: 'Logique' },
};
export const Large: Story = {
  args: { size: 'lg', relief: true, showArrow: true, label: 'Lancer la simulation' },
};
export const WithArrow: Story = {
  args: { showArrow: true, label: 'Continuer' },
};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = {
  args: { disabled: true, label: 'Commencer' },
};
