export interface VerticalSpan {
  top: number;
  bottom: number;
}

function computeSpanMiddle(span: VerticalSpan): number {
  return (span.top + span.bottom) / 2;
}

export function findIndexNearestToMiddle(
  spans: readonly VerticalSpan[],
  band: VerticalSpan,
  fallbackIndex: number,
): number {
  const middle = computeSpanMiddle(band);
  let nearestIndex = fallbackIndex;
  let shortestDistance = Number.POSITIVE_INFINITY;
  spans.forEach((span, index) => {
    const distance = Math.abs(computeSpanMiddle(span) - middle);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}
