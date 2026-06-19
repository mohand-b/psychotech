import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AxisType } from '@psychotech/shared';
import { Check, Lock, Mail, Rocket } from 'lucide-angular';
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

interface Shade {
  label: string;
  value: string;
}

interface AxisShades {
  label: string;
  shades: Shade[];
}

interface TypeSample {
  className: string;
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

  protected readonly axisShades: readonly AxisShades[] = this.axes.map(
    (axis) => {
      const presentation = AXIS_PRESENTATION[axis];
      return {
        label: presentation.label,
        shades: [
          { label: 'Plein', value: presentation.plainVar },
          { label: 'Pastel', value: presentation.pastelVar },
          { label: 'Bordure', value: presentation.pastelBorderVar },
          { label: 'Texte', value: presentation.textVar },
        ],
      };
    },
  );

  protected readonly scores: readonly number[] = [92, 74, 64, 48];

  protected readonly mailIcon = Mail;
  protected readonly lockIcon = Lock;
  protected readonly checkIcon = Check;
  protected readonly rocketIcon = Rocket;

  protected readonly palette: readonly PaletteGroup[] = [
    {
      title: 'Marque (violet)',
      swatches: [
        { label: 'Brand', token: '--color-brand' },
        { label: 'Brand foncé (hover)', token: '--color-brand-dark' },
        { label: 'Brand pastel', token: '--color-brand-pastel' },
        { label: 'Brand pastel bordure', token: '--color-brand-pastel-border' },
        { label: 'Brand chargement', token: '--color-brand-loading' },
      ],
    },
    {
      title: 'Marque secondaire (vert)',
      swatches: [
        { label: 'Secondary', token: '--color-secondary' },
        { label: 'Secondary foncé', token: '--color-secondary-dark' },
        { label: 'Secondary relief', token: '--color-secondary-relief' },
        { label: 'Secondary pastel', token: '--color-secondary-pastel' },
        {
          label: 'Secondary pastel bordure',
          token: '--color-secondary-pastel-border',
        },
        { label: 'Secondary label', token: '--color-secondary-label' },
      ],
    },
    {
      title: 'Surfaces & bordures',
      swatches: [
        { label: 'Fond', token: '--color-bg' },
        { label: 'Carte', token: '--color-surface' },
        { label: 'Surface neutre', token: '--color-surface-neutral' },
        { label: 'Surface survol', token: '--color-surface-hover' },
        { label: 'Bordure', token: '--color-border' },
        { label: 'Bordure survol', token: '--color-border-hover' },
      ],
    },
    {
      title: 'Texte',
      swatches: [
        { label: 'Encre', token: '--color-ink' },
        { label: 'Texte secondaire', token: '--color-text-secondary' },
        { label: 'Label', token: '--color-label' },
        { label: 'Texte désactivé', token: '--color-text-disabled' },
      ],
    },
    {
      title: "Pastilles d'avis",
      swatches: [
        { label: 'Très bon', token: '--color-score-excellent' },
        { label: 'Acceptable', token: '--color-score-acceptable' },
        { label: 'Fragile', token: '--color-score-fragile' },
        { label: 'Insuffisant', token: '--color-score-insufficient' },
      ],
    },
  ];

  protected readonly typography: readonly TypeSample[] = [
    { className: 't-display', label: 'Display 40 / 44' },
    { className: 't-page-title', label: 'Titre de page 28 / 34' },
    { className: 't-card-title', label: 'Titre de carte 18 / 24' },
    { className: 't-body', label: 'Corps de texte 15 / 22' },
    { className: 't-support', label: "Texte d'appui 13 / 18" },
    { className: 't-label', label: 'Label de section 11 / 14' },
  ];

  protected readonly badges: readonly BadgeSample[] = [
    { tone: 'neutral', label: 'Neutre' },
    { tone: 'info', label: 'Info' },
    { tone: 'soon', label: 'Bientôt' },
    { tone: 'sector', label: 'Ferroviaire' },
  ];
}
