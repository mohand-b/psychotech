import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { Button } from '../button/button';
import { ActionFooter } from './action-footer';

const meta: Meta<ActionFooter> = {
  title: 'Design System/Action Footer',
  component: ActionFooter,
  tags: ['autodocs'],
  decorators: [moduleMetadata({ imports: [ActionFooter, Button] })],
};
export default meta;

type Story = StoryObj<ActionFooter>;

export const SinglePrimary: Story = {
  render: () => ({
    template: `
      <ui-action-footer>
        <ui-button color="brand" size="lg" block="mobile">
          Commencer la session
        </ui-button>
      </ui-action-footer>
    `,
  }),
};

export const PrimaryThenSecondary: Story = {
  render: () => ({
    template: `
      <ui-action-footer>
        <ui-button color="brand" block="mobile">
          Nouvel entraînement
        </ui-button>
        <ui-button
          color="neutral"
          appearance="outlined"
          block="mobile"
        >
          Retour aux entraînements
        </ui-button>
      </ui-action-footer>
    `,
  }),
};
