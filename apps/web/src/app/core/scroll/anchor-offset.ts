export type AnchorOffset = () => [number, number];

const MOBILE_HEADER_ANCHOR_OFFSET = 76;
const DESKTOP_NAVBAR_ANCHOR_OFFSET = 88;
const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

export function createAnchorOffset(view: Window): AnchorOffset {
  const mobileQuery = view.matchMedia(MOBILE_MEDIA_QUERY);
  return () => [
    0,
    mobileQuery.matches
      ? MOBILE_HEADER_ANCHOR_OFFSET
      : DESKTOP_NAVBAR_ANCHOR_OFFSET,
  ];
}
