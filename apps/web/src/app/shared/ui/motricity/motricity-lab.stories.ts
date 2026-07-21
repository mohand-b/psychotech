import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { generateMotricityCourses } from '@psychotech/shared';
import { MotricityCoursePreview } from './motricity-course-preview';
import { MotricityLab } from './motricity-lab';

const meta: Meta<MotricityLab> = {
  title: 'Motricité/Parcours',
  component: MotricityLab,
  parameters: { layout: 'padded' },
};
export default meta;

type Story = StoryObj<MotricityLab>;

export const Generateur: Story = {
  name: 'Générateur',
};

const levelStory = (index: number): StoryObj<{ seed: string }> => ({
  argTypes: { seed: { control: { type: 'text' } } },
  args: { seed: 'galerie' },
  decorators: [moduleMetadata({ imports: [MotricityCoursePreview] })],
  render: (args) => ({
    props: {
      ...args,
      course: generateMotricityCourses(args.seed)[index],
    },
    template: `<ui-motricity-course-preview [course]="course" />`,
  }),
});

export const Niveau1: StoryObj<{ seed: string }> = {
  ...levelStory(0),
  name: 'Niveau 1 — tracé simple',
};

export const Niveau2: StoryObj<{ seed: string }> = {
  ...levelStory(1),
  name: 'Niveau 2 — zigzag',
};

export const Niveau3: StoryObj<{ seed: string }> = {
  ...levelStory(2),
  name: 'Niveau 3 — serpentin',
};
