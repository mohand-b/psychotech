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
      options: ['solid', 'ghost'],
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
    relief: false,
    disabled: false,
    loading: false,
    showArrow: false,
    label: 'Créer un compte',
  },
  render: (args) => ({
    props: args,
    template: `<ui-button [color]="color" [appearance]="appearance" [relief]="relief" [disabled]="disabled" [loading]="loading" [showArrow]="showArrow">{{ label }}</ui-button>`,
  }),
};
export default meta;

type Story = StoryObj<ButtonStoryArgs>;

export const Brand: Story = {};
export const Green: Story = {
  args: { color: 'green', label: 'Lancer la simulation' },
};
export const Ghost: Story = {
  args: { color: 'neutral', appearance: 'ghost', label: 'Voir le détail' },
};
export const Relief: Story = {
  args: { relief: true, label: 'Lancer la session' },
};
export const ReliefGreen: Story = {
  args: { color: 'green', relief: true, label: "Valider l'exercice" },
};
export const GhostColored: Story = {
  args: { color: 'logic', appearance: 'ghost', label: 'Logique' },
};
export const WithArrow: Story = {
  args: { showArrow: true, label: 'Continuer' },
};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = {
  args: { disabled: true, label: 'Commencer' },
};
