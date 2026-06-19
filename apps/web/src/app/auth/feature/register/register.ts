import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Sector, SectorSummaryDto } from '@psychotech/shared';
import { Lock, Mail, User } from 'lucide-angular';
import { AuthFacade } from '../../data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { Badge } from '../../../shared/ui/badge/badge';
import { Button } from '../../../shared/ui/button/button';
import { Card } from '../../../shared/ui/card/card';
import { FormField } from '../../../shared/ui/form-field/form-field';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Badge, Button, Card, FormField],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly router = inject(Router);

  protected readonly mailIcon = Mail;
  protected readonly userIcon = User;
  protected readonly lockIcon = Lock;

  protected readonly email = signal('');
  protected readonly firstName = signal('');
  protected readonly lastName = signal('');
  protected readonly password = signal('');
  protected readonly currentSector = signal<Sector | null>(null);
  protected readonly sectors = signal<readonly SectorSummaryDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  constructor() {
    this.catalogFacade.getSectors().subscribe((sectors) => {
      this.sectors.set(sectors);
      const firstActive = sectors.find((sector) => sector.isActive);
      if (firstActive) {
        this.currentSector.set(firstActive.code);
      }
    });
  }

  selectSector(sector: SectorSummaryDto): void {
    if (sector.isActive) {
      this.currentSector.set(sector.code);
    }
  }

  submit(): void {
    const currentSector = this.currentSector();
    if (!currentSector) {
      this.error.set('Sélectionnez un secteur');
      return;
    }
    this.error.set(null);
    this.submitting.set(true);
    this.authFacade
      .register({
        email: this.email(),
        password: this.password(),
        firstName: this.firstName(),
        lastName: this.lastName(),
        currentSector,
      })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => {
          this.error.set('Inscription impossible');
          this.submitting.set(false);
        },
      });
  }
}
