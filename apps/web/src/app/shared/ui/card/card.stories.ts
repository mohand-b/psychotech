import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { Card } from './card';

const meta: Meta<Card> = {
  title: 'Design System/Card',
  component: Card,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [Card] })],
  argTypes: {
    sectionLabel: { control: 'text' },
    footer: { control: 'boolean' },
    padding: { control: { type: 'number', min: 0, max: 48, step: 4 } },
  },
  args: {
    sectionLabel: '',
    footer: false,
    padding: 24,
  },
  render: (args) => ({
    props: args,
    template: `
      <ui-card [sectionLabel]="sectionLabel" [footer]="footer" [padding]="padding" style="width: 360px;">
        <p class="t-body">Contenu projeté de la carte.</p>
        <span card-footer class="t-support">Pied de carte</span>
      </ui-card>
    `,
  }),
};
export default meta;

type Story = StoryObj<Card>;

export const Default: Story = {};
export const WithSectionLabel: Story = {
  args: { sectionLabel: 'Progression' },
};
export const WithFooter: Story = {
  args: { sectionLabel: 'Temps de réaction', footer: true },
};
