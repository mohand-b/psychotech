import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { Check, Rocket } from 'lucide-angular';
import { AxisChip } from '../../../shared/ui/axis-chip/axis-chip';
import { Badge, BadgeTone } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { FormField } from '../../../shared/ui/form-field/form-field';
import { ScorePill } from '../../../shared/ui/score-pill/score-pill';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';

interface Swatch {
  label: string;
  token: string;
}

interface PaletteGroup {
  title: string;
  swatches: Swatch[];
}

interface TypeSample {
  className: string;
  label: string;
}

interface AxisEntry {
  axis: AxisType;
  label: string;
}

interface BadgeSample {
  tone: BadgeTone;
  label: string;
}

@Component({
  selector: 'app-ui-kit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisChip, Badge, Button, Card, FormField, ScorePill],
  templateUrl: './ui-kit.html',
  styleUrl: './ui-kit.css',
})
export class UiKit {
  protected readonly axes: readonly AxisType[] = [
    AxisType.LOGIC,
    AxisType.MEMORY,
    AxisType.VISUAL_DISCRIMINATION,
    AxisType.REACTIVITY,
    AxisType.MOTOR_SKILLS,
  ];

  protected readonly axisEntries: readonly AxisEntry[] = this.axes.map(
    (axis) => ({ axis, label: AXIS_PRESENTATION[axis].label }),
  );

  protected readonly scores: readonly number[] = [92, 74, 64, 48];

  protected readonly checkIcon = Check;
  protected readonly rocketIcon = Rocket;

  protected readonly palette: readonly PaletteGroup[] = [
    {
      title: 'Marque',
      swatches: [
        { label: 'Brand', token: '--color-brand' },
        { label: 'Secondary', token: '--color-secondary' },
        { label: 'Secondary strong', token: '--color-secondary-strong' },
        { label: 'Secondary label', token: '--color-secondary-label' },
      ],
    },
    {
      title: 'Axes',
      swatches: [
        { label: 'Logique', token: '--color-axis-logic' },
        { label: 'Mémoire', token: '--color-axis-memory' },
        { label: 'Discrimination', token: '--color-axis-discrimination' },
        { label: 'Réactivité', token: '--color-axis-reactivity' },
        { label: 'Motricité', token: '--color-axis-motor' },
      ],
    },
    {
      title: 'Surfaces',
      swatches: [
        { label: 'Background', token: '--color-bg' },
        { label: 'Surface', token: '--color-surface' },
        { label: 'Border', token: '--color-border' },
        { label: 'Disabled', token: '--color-disabled' },
      ],
    },
    {
      title: 'Texte',
      swatches: [
        { label: 'Ink', token: '--color-ink' },
        { label: 'Text secondary', token: '--color-text-secondary' },
        { label: 'Label', token: '--color-label' },
      ],
    },
    {
      title: 'États & scores',
      swatches: [
        { label: 'Success', token: '--color-success' },
        { label: 'Danger', token: '--color-danger' },
        { label: 'Score excellent', token: '--color-score-excellent' },
        { label: 'Score good', token: '--color-score-good' },
        { label: 'Score fair', token: '--color-score-fair' },
        { label: 'Score poor', token: '--color-score-poor' },
      ],
    },
  ];

  protected readonly typography: readonly TypeSample[] = [
    { className: 't-display', label: 'Display 40' },
    { className: 't-page-title', label: 'Titre de page 28' },
    { className: 't-card-title', label: 'Titre de carte 18' },
    { className: 't-body', label: 'Corps de texte 15' },
    { className: 't-support', label: 'Texte de support 13' },
    { className: 't-label', label: 'Label 11' },
  ];

  protected readonly badges: readonly BadgeSample[] = [
    { tone: 'neutral', label: 'Neutre' },
    { tone: 'info', label: 'Info' },
    { tone: 'soon', label: 'Bientôt' },
    { tone: 'sector', label: 'Ferroviaire' },
  ];
}
