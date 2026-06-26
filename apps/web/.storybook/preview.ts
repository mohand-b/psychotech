import type { Preview } from '@storybook/angular';

const preview: Preview = {
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
    options: {
      storySort: {
        order: ['Design System', 'Pages'],
      },
    },
  },
};

export default preview;
