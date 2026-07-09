export interface SessionCountdown {
  remainingSec: number;
  fraction: number;
}

export function countdownFrom(
  anchorMs: number,
  nowMs: number,
  durationSec: number,
): SessionCountdown {
  const elapsedSec = Math.max(0, (nowMs - anchorMs) / 1000);
  return {
    remainingSec: Math.max(0, Math.ceil(durationSec - elapsedSec)),
    fraction: Math.min(1, Math.max(0, 1 - elapsedSec / durationSec)),
  };
}
