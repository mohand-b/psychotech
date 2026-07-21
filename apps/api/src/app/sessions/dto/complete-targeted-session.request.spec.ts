import { AxisType } from '@psychotech/shared';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { describe, expect, it } from 'vitest';
import { CompleteTargetedSessionRequest } from './complete-targeted-session.request';

function memoryRequest(input: unknown[]): CompleteTargetedSessionRequest {
  return plainToInstance(CompleteTargetedSessionRequest, {
    axis: AxisType.MEMORY,
    sequences: [{ index: 0, input, timeMs: 12_000, timedOut: false }],
  });
}

describe('CompleteTargetedSessionRequest (memory input)', () => {
  it('accepts a plain digit restitution', async () => {
    const errors = await validate(memoryRequest([7, 1, 4, 9]));
    expect(errors).toHaveLength(0);
  });

  it('accepts null entries marking skipped positions', async () => {
    const errors = await validate(memoryRequest([7, null, 4, null]));
    expect(errors).toHaveLength(0);
  });

  it('rejects digits outside 0-9', async () => {
    const errors = await validate(memoryRequest([7, 10, 4]));
    expect(errors.length).toBeGreaterThan(0);
  });

  it('rejects non numeric entries other than null', async () => {
    const errors = await validate(memoryRequest([7, 'x', 4]));
    expect(errors.length).toBeGreaterThan(0);
  });
});
