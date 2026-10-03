import { CanDeactivateFn } from '@angular/router';

export type PlayLeaveDecision = 'leave' | 'confirm' | 'stay';

export interface PlayLeaveState {
  live: boolean;
  submitted: boolean;
  unsent: boolean;
}

export interface LeavablePlay {
  confirmLeave(): boolean;
}

export function resolvePlayLeaveDecision(
  state: PlayLeaveState,
): PlayLeaveDecision {
  if (!state.live) {
    return 'leave';
  }
  if (!state.submitted) {
    return 'confirm';
  }
  return state.unsent ? 'stay' : 'leave';
}

export class PlayLeaveControl {
  private accepted = false;

  constructor(
    private readonly state: () => PlayLeaveState,
    private readonly askConfirmation: () => void,
  ) {}

  acceptLeave(): void {
    this.accepted = true;
  }

  confirmLeave(): boolean {
    const decision = this.resolveLeaveDecision();
    if (decision === 'confirm') {
      this.askConfirmation();
    }
    return decision === 'leave';
  }

  blockUnload(event: BeforeUnloadEvent): void {
    if (this.resolveLeaveDecision() !== 'leave') {
      event.preventDefault();
    }
  }

  private resolveLeaveDecision(): PlayLeaveDecision {
    return this.accepted ? 'leave' : resolvePlayLeaveDecision(this.state());
  }
}

export const confirmPlayLeaveGuard: CanDeactivateFn<LeavablePlay> = (
  component,
) => component.confirmLeave();
