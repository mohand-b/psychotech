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
    variant: {
      control: { type: 'select' },
      options: ['primary', 'primary-green', 'secondary'],
    },
    disabled: { control: 'boolean' },
    loading: { control: 'boolean' },
    showArrow: { control: 'boolean' },
    icon: { control: false },
    label: { control: 'text' },
  },
  args: {
    variant: 'primary',
    disabled: false,
    loading: false,
    showArrow: false,
    label: 'Créer un compte',
  },
  render: (args) => ({
    props: args,
    template: `<ui-button [variant]="variant" [disabled]="disabled" [loading]="loading" [showArrow]="showArrow">{{ label }}</ui-button>`,
  }),
};
export default meta;

type Story = StoryObj<ButtonStoryArgs>;

export const Primary: Story = {};
export const PrimaryGreen: Story = {
  args: { variant: 'primary-green', label: 'Lancer la simulation' },
};
export const Secondary: Story = {
  args: { variant: 'secondary', label: 'Voir le détail' },
};
export const WithArrow: Story = {
  args: { showArrow: true, label: 'Continuer' },
};
export const Loading: Story = { args: { loading: true } };
export const Disabled: Story = {
  args: { disabled: true, label: 'Commencer' },
};
