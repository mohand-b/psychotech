import type { Meta, StoryObj } from '@storybook/angular';
import { Sector } from '@psychotech/shared';
import { Select, SelectOption } from './select';

const sectorOptions: SelectOption[] = Object.values(Sector).map((sector) => ({
  value: sector,
  label: sector,
  disabled: sector !== Sector.RAILWAY,
}));

const meta: Meta<Select> = {
  title: 'Design System/Select',
  component: Select,
  tags: ['autodocs'],
  argTypes: {
    label: { control: 'text' },
    value: { control: { type: 'select' }, options: Object.values(Sector) },
    options: { control: 'object' },
  },
  args: {
    label: 'Secteur',
    value: Sector.RAILWAY,
    options: sectorOptions,
  },
};
export default meta;

type Story = StoryObj<Select>;

export const Default: Story = {};
export const AllEnabled: Story = {
  args: {
    options: Object.values(Sector).map((sector) => ({
      value: sector,
      label: sector,
    })),
  },
};
