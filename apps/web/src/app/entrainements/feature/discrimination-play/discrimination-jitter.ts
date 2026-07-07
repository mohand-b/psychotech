import { SequenceOffset } from '@psychotech/shared';

export const JITTER_SAFE_MARGIN_X = 24;
export const JITTER_SAFE_MARGIN_Y = 16;

export interface JitterZoneMetrics {
  zoneWidth: number;
  zoneHeight: number;
  contentWidth: number;
  contentHeight: number;
}

export interface JitterPlacement {
  x: number;
  y: number;
  scale: number;
}

export function computeJitterPlacement(
  offset: SequenceOffset,
  metrics: JitterZoneMetrics,
): JitterPlacement {
  const usableWidth = Math.max(
    0,
    metrics.zoneWidth - 2 * JITTER_SAFE_MARGIN_X,
  );
  const usableHeight = Math.max(
    0,
    metrics.zoneHeight - 2 * JITTER_SAFE_MARGIN_Y,
  );
  const scale =
    metrics.contentWidth > 0 && metrics.contentHeight > 0
      ? Math.min(
          1,
          usableWidth / metrics.contentWidth,
          usableHeight / metrics.contentHeight,
        )
      : 1;
  const amplitudeX = Math.max(
    0,
    (metrics.zoneWidth - metrics.contentWidth * scale) / 2 -
      JITTER_SAFE_MARGIN_X,
  );
  const amplitudeY = Math.max(
    0,
    (metrics.zoneHeight - metrics.contentHeight * scale) / 2 -
      JITTER_SAFE_MARGIN_Y,
  );
  return {
    x: Math.round(offset.fx * amplitudeX * 10) / 10,
    y: Math.round(offset.fy * amplitudeY * 10) / 10,
    scale: Math.round(scale * 1000) / 1000,
  };
}

export function jitterTransform(
  offset: SequenceOffset,
  metrics: JitterZoneMetrics | null,
): string {
  if (!metrics) {
    return 'translate(0px, 0px)';
  }
  const placement = computeJitterPlacement(offset, metrics);
  return `translate(${placement.x}px, ${placement.y}px) scale(${placement.scale})`;
}
