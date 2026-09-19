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

export function playLeaveDecision(state: PlayLeaveState): PlayLeaveDecision {
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

  accept(): void {
    this.accepted = true;
  }

  confirmLeave(): boolean {
    const decision = this.decision();
    if (decision === 'confirm') {
      this.askConfirmation();
    }
    return decision === 'leave';
  }

  blockUnload(event: BeforeUnloadEvent): void {
    if (this.decision() !== 'leave') {
      event.preventDefault();
    }
  }

  private decision(): PlayLeaveDecision {
    return this.accepted ? 'leave' : playLeaveDecision(this.state());
  }
}

export const confirmPlayLeaveGuard: CanDeactivateFn<LeavablePlay> = (
  component,
) => component.confirmLeave();
