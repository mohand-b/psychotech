import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter } from 'rxjs';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { FocusedHeader } from '../../shared/ui/focused-header/focused-header';
import { Navbar } from '../../shared/ui/navbar/navbar';

interface FocusedHeaderConfig {
  title: string;
  backLabel: string;
  backLink: string;
}

@Component({
  selector: 'app-connected-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Navbar, FocusedHeader],
  templateUrl: './connected-layout.html',
  styleUrl: './connected-layout.css',
})
export class ConnectedLayout {
  private readonly energyFacade = inject(EnergyFacade);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly focusedHeader = signal<FocusedHeaderConfig | null>(
    this.readFocusedHeader(),
  );

  constructor() {
    this.energyFacade
      .load()
      .pipe(takeUntilDestroyed())
      .subscribe({ error: () => undefined });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.focusedHeader.set(this.readFocusedHeader()));
  }

  private readFocusedHeader(): FocusedHeaderConfig | null {
    let route: ActivatedRoute | null = this.route;
    while (route?.firstChild) {
      route = route.firstChild;
    }
    const data = route?.snapshot?.data;
    return (data?.['focusedHeader'] as FocusedHeaderConfig) ?? null;
  }
}
