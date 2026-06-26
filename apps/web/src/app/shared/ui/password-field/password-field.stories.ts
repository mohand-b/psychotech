import type { Meta, StoryObj } from '@storybook/angular';
import { PasswordField } from './password-field';

const meta: Meta<PasswordField> = {
  title: 'Design System/Password Field',
  component: PasswordField,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    error: { control: 'text' },
    valid: { control: 'boolean' },
    value: { control: 'text' },
  },
  args: {
    label: 'Mot de passe',
    placeholder: '••••••••',
    error: null,
    valid: false,
    value: '',
  },
};
export default meta;

type Story = StoryObj<PasswordField>;

export const Default: Story = {};
export const Filled: Story = { args: { value: 'super-secret' } };
export const Confirmed: Story = {
  args: { label: 'Confirmer le mot de passe', value: 'super-secret', valid: true },
};
export const Error: Story = {
  args: { value: 'abc', error: 'Au moins 8 caractères' },
};
