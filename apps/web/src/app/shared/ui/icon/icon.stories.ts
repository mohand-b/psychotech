import type { Meta, StoryObj } from '@storybook/angular';
import { Zap } from 'lucide-angular';
import { Icon } from './icon';

const meta: Meta<Icon> = {
  title: 'Design System/Icon',
  component: Icon,
  tags: ['autodocs'],
  argTypes: {
    img: { control: false },
    size: { control: { type: 'number', min: 10, max: 64, step: 1 } },
    strokeWidth: { control: { type: 'number', min: 1, max: 3, step: 0.5 } },
  },
  args: {
    img: Zap,
    size: 15,
    strokeWidth: 2,
  },
};
export default meta;

type Story = StoryObj<Icon>;

export const Default: Story = {};
export const Large: Story = { args: { size: 40 } };
export const Thin: Story = { args: { size: 40, strokeWidth: 1.5 } };
