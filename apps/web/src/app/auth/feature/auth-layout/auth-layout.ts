import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';

interface AuthBrandView {
  title: string;
  deco: boolean;
}

@Component({
  selector: 'app-auth-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.css',
})
export class AuthLayout {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly brand = signal<AuthBrandView>(this.readBrand());

  constructor() {
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.brand.set(this.readBrand()));
  }

  private readBrand(): AuthBrandView {
    let route: ActivatedRoute | null = this.route;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    const data = route?.snapshot?.data;
    return {
      title: (data?.['brandTitle'] as string | undefined) ?? '',
      deco: data?.['brandDeco'] === true,
    };
  }
}
