import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { DominoGallery } from './domino-gallery';
import { DominoLab } from './domino-lab';

const meta: Meta<DominoLab> = {
  title: 'Logique/Dominos',
  component: DominoLab,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<DominoLab>;

export const Generateur: Story = {
  name: 'Générateur',
};

export const Galerie: StoryObj<{ seed: string }> = {
  name: 'Galerie',
  argTypes: { seed: { control: { type: 'text' } } },
  args: { seed: 'galerie' },
  decorators: [moduleMetadata({ imports: [DominoGallery] })],
  render: (args) => ({
    props: args,
    template: `<app-domino-gallery [seed]="seed" />`,
  }),
};
