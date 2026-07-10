import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
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
  private readonly router = inject(Router);

  protected readonly simulationIcon = Layers;
  protected readonly targetedIcon = Target;

  protected readonly simulationFeatures = [
    'Tous les axes, notation pondérée par secteur',
    "Conditions réelles d'examen",
    'Analyse de performance globale et par axe',
    "Sans aide ni option d'entraînement",
  ];

  protected readonly targetedFeatures = [
    '1 axe au choix, parmi les cinq',
    'Sessions courtes (3–5 min), retour immédiat',
    'Idéal pour cibler un point faible',
    "Options d'entraînement selon l'axe",
  ];

  protected chooseAxis(): void {
    this.router.navigate(['/entrainements/choisir-axe']);
  }

  protected startSimulation(): void {
    this.router.navigate(['/entrainements/simulation']);
  }
}
