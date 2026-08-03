import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  isDevMode,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GAMEPAD_PAIRING_CODE_LENGTH } from '@psychotech/shared';
import { GamepadControllerFacade } from '../../data-access/gamepad-controller.facade';
import { Button } from '../../../shared/ui/button/button';
import { Crank } from '../../../shared/ui/crank/crank';

interface StateChip {
  label: string;
  tone: 'success' | 'warning' | 'danger';
}

@Component({
  selector: 'app-manette',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Crank],
  providers: [GamepadControllerFacade],
  templateUrl: './manette.html',
  styleUrl: './manette.css',
})
export class Manette {
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly facade = inject(GamepadControllerFacade);

  protected readonly view = this.facade.view;
  protected readonly errorMessage = this.facade.errorMessage;
  protected readonly leftSpeed = this.facade.leftSpeed;
  protected readonly rightSpeed = this.facade.rightSpeed;

  protected readonly code = signal('');

  protected readonly codeLength = GAMEPAD_PAIRING_CODE_LENGTH;

  protected readonly codeReady = computed(
    () => this.code().length === GAMEPAD_PAIRING_CODE_LENGTH,
  );

  protected readonly cranksVisible = computed(() => {
    const view = this.view();
    return view === 'CONNECTED' || view === 'SUSPENDED';
  });

  protected readonly stateChip = computed<StateChip | null>(() => {
    switch (this.view()) {
      case 'CONNECTED':
        return { label: 'Connecté', tone: 'success' };
      case 'WAITING':
        return { label: 'En attente', tone: 'warning' };
      case 'SUSPENDED':
        return { label: 'Suspendu', tone: 'warning' };
      case 'INVALID':
        return { label: 'Lien expiré', tone: 'danger' };
      default:
        return null;
    }
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.facade.release());
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.destroyRef.onDestroy(() =>
      document.removeEventListener('visibilitychange', this.onVisibilityChange),
    );
    const token = this.route.snapshot.queryParamMap.get('t');
    if (token) {
      this.connect(token);
    }
  }

  protected onCodeInput(event: Event): void {
    const digits = (event.target as HTMLInputElement).value
      .replace(/\D/g, '')
      .slice(0, GAMEPAD_PAIRING_CODE_LENGTH);
    (event.target as HTMLInputElement).value = digits;
    this.code.set(digits);
  }

  protected submitCode(): void {
    if (this.codeReady()) {
      this.connect(this.code());
    }
  }

  protected onLeftRotate(deltaRad: number): void {
    this.facade.pushLeftRotation(deltaRad);
  }

  protected onRightRotate(deltaRad: number): void {
    this.facade.pushRightRotation(deltaRad);
  }

  private connect(token: string): void {
    const forceRelay =
      isDevMode() &&
      this.route.snapshot.queryParamMap.get('transport') === 'relay';
    this.facade.connect(token, forceRelay);
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      this.facade.refreshWakeLock();
    }
  };
}
