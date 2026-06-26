import type { Meta, StoryObj } from '@storybook/angular';
import { Mail } from 'lucide-angular';
import { FormField } from './form-field';

const meta: Meta<FormField> = {
  title: 'Design System/Form Field',
  component: FormField,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
    type: { control: { type: 'select' }, options: ['text', 'email', 'password'] },
    error: { control: 'text' },
    valid: { control: 'boolean' },
    value: { control: 'text' },
    icon: { control: false },
  },
  args: {
    label: 'Adresse email',
    placeholder: 'vous@exemple.fr',
    type: 'email',
    error: null,
    valid: false,
    value: '',
  },
};
export default meta;

type Story = StoryObj<FormField>;

export const Default: Story = {};
export const WithIcon: Story = { args: { icon: Mail } };
export const Valid: Story = {
  args: { icon: Mail, value: 'camille@exemple.fr', valid: true },
};
export const Error: Story = {
  args: { icon: Mail, value: 'vous@', error: 'Adresse email invalide' },
};
