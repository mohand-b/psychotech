import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { TriangleGallery } from './triangle-gallery';
import { TriangleLab } from './triangle-lab';

const meta: Meta<TriangleLab> = {
  title: 'Logique/Triangles',
  component: TriangleLab,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<TriangleLab>;

export const Generateur: Story = {
  name: 'Générateur',
};

export const Galerie: StoryObj<{ seed: string }> = {
  name: 'Galerie',
  argTypes: { seed: { control: { type: 'text' } } },
  args: { seed: 'galerie' },
  decorators: [moduleMetadata({ imports: [TriangleGallery] })],
  render: (args) => ({
    props: args,
    template: `<app-triangle-gallery [seed]="seed" />`,
  }),
};
