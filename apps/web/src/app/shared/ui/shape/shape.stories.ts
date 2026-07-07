import { ShapeId } from '@psychotech/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { moduleMetadata } from '@storybook/angular';
import { Shape } from './shape';

const meta: Meta<Shape> = {
  title: 'Design System/Shape',
  component: Shape,
  tags: ['autodocs'],
  argTypes: {
    shape: { control: { type: 'select' }, options: Object.values(ShapeId) },
    rotation: { control: { type: 'select' }, options: [0, 90, 180, 270] },
  },
  args: {
    shape: ShapeId.TRIANGLE,
    rotation: 0,
    size: 24,
  },
};
export default meta;

type Story = StoryObj<Shape>;

export const Triangle: Story = {};
export const Diamond: Story = { args: { shape: ShapeId.DIAMOND } };
export const RectangleRotated: Story = {
  args: { shape: ShapeId.RECTANGLE, rotation: 90 },
};

export const AllShapesAndRotations: Story = {
  decorators: [moduleMetadata({ imports: [Shape] })],
  render: () => ({
    props: {
      shapes: Object.values(ShapeId),
      rotations: [0, 90, 180, 270],
    },
    template: `
      <div style="display: flex; flex-direction: column; gap: 16px;">
        @for (shape of shapes; track shape) {
          <div style="display: flex; align-items: center; gap: 24px;">
            @for (rotation of rotations; track rotation) {
              <ui-shape [shape]="shape" [rotation]="rotation" [size]="28" />
            }
          </div>
        }
      </div>
    `,
  }),
};
