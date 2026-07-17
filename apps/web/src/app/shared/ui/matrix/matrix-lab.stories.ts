import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { MatrixGallery } from './matrix-gallery';
import { MatrixLab } from './matrix-lab';

const meta: Meta<MatrixLab> = {
  title: 'Logique/Matrices',
  component: MatrixLab,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<MatrixLab>;

export const Generateur: Story = {
  name: 'Générateur',
};

export const Galerie: StoryObj<{ seed: string }> = {
  name: 'Galerie',
  argTypes: { seed: { control: { type: 'text' } } },
  args: { seed: 'galerie' },
  decorators: [moduleMetadata({ imports: [MatrixGallery] })],
  render: (args) => ({
    props: args,
    template: `<app-matrix-gallery [seed]="seed" />`,
  }),
};
