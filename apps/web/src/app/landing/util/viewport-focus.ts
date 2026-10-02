export interface VerticalSpan {
  top: number;
  bottom: number;
}

function middleOf(span: VerticalSpan): number {
  return (span.top + span.bottom) / 2;
}

export function indexNearestToMiddleOf(
  spans: readonly VerticalSpan[],
  band: VerticalSpan,
  fallbackIndex: number,
): number {
  const middle = middleOf(band);
  let nearestIndex = fallbackIndex;
  let shortestDistance = Number.POSITIVE_INFINITY;
  spans.forEach((span, index) => {
    const distance = Math.abs(middleOf(span) - middle);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}
