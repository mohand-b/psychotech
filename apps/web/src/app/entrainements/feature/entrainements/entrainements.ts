import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Layers, Target } from 'lucide-angular';
import { TrainingModeCard } from '../../ui/training-mode-card/training-mode-card';

@Component({
  selector: 'app-entrainements',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TrainingModeCard],
  templateUrl: './entrainements.html',
  styleUrl: './entrainements.css',
})
export class Entrainements {
  protected readonly simulationIcon = Layers;
  protected readonly targetedIcon = Target;

  protected readonly simulationFeatures = [
    'Tous les axes, notation pondérée par secteur',
    "Conditions réelles d'examen, minuté",
    'Analyse de performance globale et par axe',
  ];

  protected readonly targetedFeatures = [
    '1 axe au choix, parmi les cinq',
    'Sessions courtes (3–5 min), retour immédiat',
    'Idéal pour cibler un point faible',
  ];
}
