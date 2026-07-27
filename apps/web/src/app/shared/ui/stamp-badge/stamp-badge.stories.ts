import type { Meta, StoryObj } from '@storybook/angular';
import {
  AxisStampWord,
  SimulationStampQualifier,
  SimulationVerdict,
} from '@psychotech/shared';
import { StampBadge } from './stamp-badge';

const meta: Meta<StampBadge> = {
  title: 'Design System/Stamp Badge',
  component: StampBadge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};
export default meta;

type Story = StoryObj<StampBadge>;

export const SimulationFavorableSolide: Story = {
  args: {
    simulationStamp: {
      verdict: SimulationVerdict.FAVORABLE,
      qualifier: SimulationStampQualifier.SOLID,    },
  },
};

export const SimulationFavorableNet: Story = {
  args: {
    simulationStamp: {
      verdict: SimulationVerdict.FAVORABLE,
      qualifier: SimulationStampQualifier.NET,    },
  },
};

export const SimulationFavorableJuste: Story = {
  args: {
    simulationStamp: {
      verdict: SimulationVerdict.FAVORABLE,
      qualifier: SimulationStampQualifier.JUST,    },
  },
};

export const SimulationDefavorableEliminatoire: Story = {
  args: {
    simulationStamp: {
      verdict: SimulationVerdict.UNFAVORABLE,
      qualifier: SimulationStampQualifier.ELIMINATORY,    },
  },
};

export const SimulationDefavorableLimite: Story = {
  args: {
    simulationStamp: {
      verdict: SimulationVerdict.UNFAVORABLE,
      qualifier: SimulationStampQualifier.BORDERLINE,    },
  },
};

export const SimulationDefavorableInsuffisant: Story = {
  args: {
    simulationStamp: {
      verdict: SimulationVerdict.UNFAVORABLE,
      qualifier: SimulationStampQualifier.INSUFFICIENT,    },
  },
};

export const AxeSolide: Story = {
  args: { axisStamp: { word: AxisStampWord.SOLID, isEliminatory: false } },
};

export const AxeBon: Story = {
  args: { axisStamp: { word: AxisStampWord.GOOD, isEliminatory: false } },
};

export const AxeFragile: Story = {
  args: { axisStamp: { word: AxisStampWord.FRAGILE, isEliminatory: false } },
};

export const AxeFaible: Story = {
  args: { axisStamp: { word: AxisStampWord.WEAK, isEliminatory: false } },
};

export const AxeEliminatoire: Story = {
  args: {
    axisStamp: { word: AxisStampWord.ELIMINATORY, isEliminatory: true },
  },
};
