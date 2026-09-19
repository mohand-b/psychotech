import { PlayLeaveControl, playLeaveDecision } from './play-leave.guard';

describe('playLeaveDecision', () => {
  it('lets the candidate leave a screen that is not a live play', () => {
    expect(
      playLeaveDecision({ live: false, submitted: false, unsent: false }),
    ).toBe('leave');
  });

  it('asks for a confirmation while the axis is being played', () => {
    expect(
      playLeaveDecision({ live: true, submitted: false, unsent: false }),
    ).toBe('confirm');
  });

  it('keeps the candidate on the page while submitted answers are still unsent', () => {
    expect(
      playLeaveDecision({ live: true, submitted: true, unsent: true }),
    ).toBe('stay');
  });

  it('lets the navigation through once the answers are stored', () => {
    expect(
      playLeaveDecision({ live: true, submitted: true, unsent: false }),
    ).toBe('leave');
  });
});

describe('PlayLeaveControl', () => {
  function build(state: { live: boolean; submitted: boolean; unsent: boolean }) {
    const askConfirmation = vi.fn();
    return {
      askConfirmation,
      control: new PlayLeaveControl(() => state, askConfirmation),
    };
  }

  it('opens the exit confirmation and blocks a back gesture during play', () => {
    const { control, askConfirmation } = build({
      live: true,
      submitted: false,
      unsent: false,
    });

    expect(control.confirmLeave()).toBe(false);
    expect(askConfirmation).toHaveBeenCalledTimes(1);
  });

  it('blocks silently while answers are unsent, since the failure screen already offers the exit', () => {
    const { control, askConfirmation } = build({
      live: true,
      submitted: true,
      unsent: true,
    });

    expect(control.confirmLeave()).toBe(false);
    expect(askConfirmation).not.toHaveBeenCalled();
  });

  it('lets an accepted exit through whatever the state', () => {
    const { control, askConfirmation } = build({
      live: true,
      submitted: false,
      unsent: false,
    });
    control.accept();

    expect(control.confirmLeave()).toBe(true);
    expect(askConfirmation).not.toHaveBeenCalled();
  });

  it('warns before a reload or tab close only when work would be lost', () => {
    const risky = new Event('beforeunload', { cancelable: true });
    build({ live: true, submitted: false, unsent: false }).control.blockUnload(
      risky as BeforeUnloadEvent,
    );
    const safe = new Event('beforeunload', { cancelable: true });
    build({ live: true, submitted: true, unsent: false }).control.blockUnload(
      safe as BeforeUnloadEvent,
    );

    expect(risky.defaultPrevented).toBe(true);
    expect(safe.defaultPrevented).toBe(false);
  });
});
