import type { Meta, StoryObj } from '@storybook/angular';
import { PasswordStrengthMeter } from './password-strength-meter';

const meta: Meta<PasswordStrengthMeter> = {
  title: 'Design System/Password Strength Meter',
  component: PasswordStrengthMeter,
  tags: ['autodocs'],
  argTypes: {
    value: { control: 'text' },
  },
  args: {
    value: 'Abcdefg1',
  },
};
export default meta;

type Story = StoryObj<PasswordStrengthMeter>;

export const Weak: Story = { args: { value: 'abc' } };
export const Medium: Story = { args: { value: 'abcdefgh' } };
export const Strong: Story = { args: { value: 'Abcdefg1' } };
export const Robust: Story = { args: { value: 'Abcdefg1!xyzZ' } };
