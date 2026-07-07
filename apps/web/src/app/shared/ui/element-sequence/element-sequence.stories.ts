import { DiscriminationElement, ShapeId } from '@psychotech/shared';
import type { Meta, StoryObj } from '@storybook/angular';
import { ElementSequence } from './element-sequence';

const MIXED_SEQUENCE: DiscriminationElement[] = [
  { kind: 'CHAR', value: '5' },
  { kind: 'CHAR', value: 'T' },
  { kind: 'SHAPE', shape: ShapeId.SQUARE, rotation: 0 },
  { kind: 'CHAR', value: '2' },
  { kind: 'SHAPE', shape: ShapeId.TRIANGLE, rotation: 90 },
  { kind: 'CHAR', value: 'M' },
];

const SHAPES_SEQUENCE: DiscriminationElement[] = [
  { kind: 'SHAPE', shape: ShapeId.TRIANGLE, rotation: 0 },
  { kind: 'SHAPE', shape: ShapeId.DIAMOND, rotation: 90 },
  { kind: 'SHAPE', shape: ShapeId.RECTANGLE, rotation: 90 },
  { kind: 'SHAPE', shape: ShapeId.CIRCLE, rotation: 0 },
  { kind: 'SHAPE', shape: ShapeId.SQUARE, rotation: 0 },
];

const meta: Meta<ElementSequence> = {
  title: 'Design System/Element Sequence',
  component: ElementSequence,
  tags: ['autodocs'],
  args: {
    elements: MIXED_SEQUENCE,
    size: 28,
    gap: 10,
  },
};
export default meta;

type Story = StoryObj<ElementSequence>;

export const Mixed: Story = {};
export const ShapesOnly: Story = { args: { elements: SHAPES_SEQUENCE } };
export const LongTrial: Story = {
  args: {
    elements: [...MIXED_SEQUENCE, ...SHAPES_SEQUENCE, { kind: 'CHAR', value: '8' }],
    size: 24,
  },
};
