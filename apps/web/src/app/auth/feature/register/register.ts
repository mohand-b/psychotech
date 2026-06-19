import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Sector, SectorSummaryDto } from '@psychotech/shared';
import { AuthFacade } from '../../data-access/auth.facade';
import { CatalogFacade } from '../../../catalog/data-access/catalog.facade';
import { inputValue } from '../../../shared/util/input-value';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly authFacade = inject(AuthFacade);
  private readonly catalogFacade = inject(CatalogFacade);
  private readonly router = inject(Router);
  protected readonly inputValue = inputValue;
  protected readonly email = signal('');
  protected readonly displayName = signal('');
  protected readonly password = signal('');
  protected readonly currentSector = signal<Sector | null>(null);
  protected readonly sectors = signal<SectorSummaryDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  constructor() {
    this.catalogFacade
      .getActiveSectors()
      .subscribe((sectors) => this.sectors.set(sectors));
  }

  selectSector(event: Event): void {
    const code = inputValue(event);
    const sector = this.sectors().find((entry) => entry.code === code);
    this.currentSector.set(sector ? sector.code : null);
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
        displayName: this.displayName(),
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
