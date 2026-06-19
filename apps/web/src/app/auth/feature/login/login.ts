import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthFacade } from '../../data-access/auth.facade';
import { inputValue } from '../../../shared/util/input-value';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './login.html',
})
export class Login {
  private readonly authFacade = inject(AuthFacade);
  private readonly router = inject(Router);
  protected readonly inputValue = inputValue;
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly submitting = signal(false);

  submit(): void {
    this.error.set(null);
    this.submitting.set(true);
    this.authFacade
      .login({ email: this.email(), password: this.password() })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: () => {
          this.error.set('Identifiants invalides');
          this.submitting.set(false);
        },
      });
  }
}
