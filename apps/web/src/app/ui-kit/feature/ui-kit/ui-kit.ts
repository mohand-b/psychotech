import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AXIS_META, AxisType } from '@psychotech/shared';
import { Check, Lock, Mail, Play, Zap } from 'lucide-angular';
import { AxisChip } from '../../../shared/ui/axis-chip/axis-chip';
import { Badge } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { FormField } from '../../../shared/ui/form-field/form-field';
import { Icon } from '../../../shared/ui/icon/icon';
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

interface AxisEntry {
  axis: AxisType;
  label: string;
}

interface TypeSample {
  className: string;
  label: string;
}

@Component({
  selector: 'app-ui-kit',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisChip, Badge, Button, Card, FormField, Icon, ScorePill],
  templateUrl: './ui-kit.html',
  styleUrl: './ui-kit.css',
})
export class UiKit {
  protected readonly axes: readonly AxisType[] = Object.keys(
    AXIS_META,
  ) as AxisType[];

  protected readonly axisEntries: readonly AxisEntry[] = this.axes.map(
    (axis) => ({ axis, label: AXIS_PRESENTATION[axis].label }),
  );

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

  protected readonly playIcon = Play;
  protected readonly checkIcon = Check;
  protected readonly mailIcon = Mail;
  protected readonly lockIcon = Lock;
  protected readonly zapIcon = Zap;

  protected readonly palette: readonly PaletteGroup[] = [
    {
      title: 'Fondations',
      swatches: [
        { label: 'Brand', token: '--brand' },
        { label: 'Brand hover', token: '--brand-hover' },
        { label: 'Brand pastel', token: '--brand-pastel' },
        { label: 'Brand pastel bd', token: '--brand-pastel-bd' },
        { label: 'Ink', token: '--ink' },
        { label: 'Texte secondaire', token: '--text-secondary' },
        { label: 'Label', token: '--label' },
        { label: 'Bordure', token: '--border' },
        { label: 'Bordure survol', token: '--border-hover' },
        { label: 'Fond', token: '--bg' },
        { label: 'Carte', token: '--card' },
        { label: 'Surface muette', token: '--surface-muted' },
        { label: 'Texte désactivé', token: '--text-disabled' },
        { label: 'Séparateur doux', token: '--divider-soft' },
      ],
    },
    {
      title: 'Marque secondaire',
      swatches: [
        { label: 'Secondary', token: '--secondary' },
        { label: 'Secondary dark', token: '--secondary-dark' },
        { label: 'Secondary hover', token: '--secondary-hover' },
        { label: 'Secondary relief', token: '--secondary-relief' },
        { label: 'Secondary pastel', token: '--secondary-pastel' },
        { label: 'Secondary pastel bd', token: '--secondary-pastel-bd' },
        { label: 'Secondary label', token: '--secondary-label' },
      ],
    },
    {
      title: "Pastilles d'avis",
      swatches: [
        { label: 'Très bon', token: '--rating-good' },
        { label: 'Acceptable', token: '--rating-ok' },
        { label: 'Fragile', token: '--rating-weak' },
        { label: 'Insuffisant', token: '--rating-bad' },
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
}
