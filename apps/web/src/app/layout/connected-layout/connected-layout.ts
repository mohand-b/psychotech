import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Navbar } from '../../shared/ui/navbar/navbar';

@Component({
  selector: 'app-connected-layout',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, Navbar],
  templateUrl: './connected-layout.html',
  styleUrl: './connected-layout.css',
})
export class ConnectedLayout {}
