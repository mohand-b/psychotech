import {
  JITTER_SAFE_MARGIN_X,
  JITTER_SAFE_MARGIN_Y,
  JitterZoneMetrics,
  computeJitterPlacement,
  jitterTransform,
} from './discrimination-jitter';

function assertWithinSafeMargins(
  metrics: JitterZoneMetrics,
  fx: number,
  fy: number,
): void {
  const placement = computeJitterPlacement({ fx, fy }, metrics);
  const halfWidth = (metrics.contentWidth * placement.scale) / 2;
  const halfHeight = (metrics.contentHeight * placement.scale) / 2;
  expect(Math.abs(placement.x) + halfWidth).toBeLessThanOrEqual(
    metrics.zoneWidth / 2 - JITTER_SAFE_MARGIN_X + 0.05,
  );
  expect(Math.abs(placement.y) + halfHeight).toBeLessThanOrEqual(
    metrics.zoneHeight / 2 - JITTER_SAFE_MARGIN_Y + 0.05,
  );
}

describe('computeJitterPlacement', () => {
  const narrowContent: JitterZoneMetrics = {
    zoneWidth: 360,
    zoneHeight: 150,
    contentWidth: 180,
    contentHeight: 40,
  };
  const wideContent: JitterZoneMetrics = {
    zoneWidth: 360,
    zoneHeight: 150,
    contentWidth: 312,
    contentHeight: 40,
  };
  const overflowingContent: JitterZoneMetrics = {
    zoneWidth: 360,
    zoneHeight: 150,
    contentWidth: 420,
    contentHeight: 40,
  };

  it('gives narrow content a full jitter amplitude that stops at the safe margins', () => {
    const placement = computeJitterPlacement({ fx: 1, fy: -1 }, narrowContent);
    expect(placement.scale).toBe(1);
    expect(placement.x).toBe(66);
    expect(placement.y).toBe(-39);
    for (const fx of [-1, -0.4, 0, 0.7, 1]) {
      for (const fy of [-1, 0, 1]) {
        assertWithinSafeMargins(narrowContent, fx, fy);
      }
    }
  });

  it('cancels the jitter when the content fills the usable width', () => {
    const placement = computeJitterPlacement({ fx: 1, fy: 0 }, wideContent);
    expect(placement.scale).toBe(1);
    expect(placement.x).toBe(0);
    assertWithinSafeMargins(wideContent, 1, 1);
  });

  it('scales overflowing content down to the usable area with no jitter', () => {
    const placement = computeJitterPlacement(
      { fx: 1, fy: 1 },
      overflowingContent,
    );
    expect(placement.scale).toBeLessThan(1);
    expect(placement.scale).toBeCloseTo(312 / 420, 3);
    expect(placement.x).toBe(0);
    assertWithinSafeMargins(overflowingContent, 1, 1);
    assertWithinSafeMargins(overflowingContent, -1, -1);
  });

  it('never collapses the content when the zone is unmeasured or too small', () => {
    for (const zoneWidth of [0, 10, 2 * JITTER_SAFE_MARGIN_X]) {
      const placement = computeJitterPlacement(
        { fx: 1, fy: 1 },
        { zoneWidth, zoneHeight: 150, contentWidth: 180, contentHeight: 40 },
      );
      expect(placement.scale).toBe(1);
    }
    const placement = computeJitterPlacement(
      { fx: 1, fy: 1 },
      { zoneWidth: 360, zoneHeight: 0, contentWidth: 180, contentHeight: 40 },
    );
    expect(placement.scale).toBe(1);
  });

  it('keeps a zero factor centered whatever the metrics', () => {
    for (const metrics of [narrowContent, wideContent, overflowingContent]) {
      const placement = computeJitterPlacement({ fx: 0, fy: 0 }, metrics);
      expect(placement.x).toBe(0);
      expect(placement.y).toBe(0);
    }
  });
});

describe('jitterTransform', () => {
  it('falls back to a neutral transform before any measurement', () => {
    expect(jitterTransform({ fx: 1, fy: 1 }, null)).toBe(
      'translate(0px, 0px)',
    );
  });

  it('renders the computed placement as a css transform', () => {
    expect(
      jitterTransform(
        { fx: 0.5, fy: -0.5 },
        { zoneWidth: 360, zoneHeight: 150, contentWidth: 180, contentHeight: 40 },
      ),
    ).toBe('translate(33px, -19.5px) scale(1)');
  });
});
