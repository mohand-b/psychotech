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
        <ui-button color="brand" size="lg" relief="mobile" block="mobile">
          Commencer la session
        </ui-button>
        <p actionFooterNote style="margin:0;font:400 13px/18px var(--font-ui);color:var(--label);text-align:center">
          Le chronomètre démarre après le décompte.
        </p>
      </ui-action-footer>
    `,
  }),
};

export const PrimaryThenSecondary: Story = {
  render: () => ({
    template: `
      <ui-action-footer>
        <ui-button color="brand" relief="mobile" block="mobile">
          Nouvel entraînement
        </ui-button>
        <ui-button
          color="neutral"
          appearance="outlined"
          relief="mobile"
          block="mobile"
        >
          Retour aux entraînements
        </ui-button>
        <p actionFooterNote style="margin:0;font:400 13px/18px var(--font-ui);color:var(--label);text-align:center">
          Chaque simulation génère de nouvelles épreuves.
        </p>
      </ui-action-footer>
    `,
  }),
};
