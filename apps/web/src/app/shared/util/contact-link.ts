export type ContactMotif = 'question' | 'suggestion' | 'probleme';

export const CONTACT_ROUTE = '/contact';
export const CONTACT_MOTIF_QUERY_PARAM = 'motif';
export const CONTACT_SESSION_QUERY_PARAM = 'session';
export const CONTACT_ORIGIN_QUERY_PARAM = 'from';

interface ContactLinkTarget {
  motif: ContactMotif;
  sessionId?: string;
  origin?: string;
}

export function contactQueryParams(
  target: ContactLinkTarget,
): Record<string, string> {
  return {
    [CONTACT_MOTIF_QUERY_PARAM]: target.motif,
    ...(target.sessionId
      ? { [CONTACT_SESSION_QUERY_PARAM]: target.sessionId }
      : {}),
    ...(target.origin ? { [CONTACT_ORIGIN_QUERY_PARAM]: target.origin } : {}),
  };
}
