import { SsoErrorCode, isSsoErrorCode } from '@psychotech/shared';

const SSO_ERROR_MESSAGES: Record<SsoErrorCode, string> = {
  GOOGLE_DENIED:
    "L'accès a été refusé chez Google. Vous pouvez réessayer ou continuer par email.",
  GOOGLE_INTERRUPTED: 'La connexion avec Google a été interrompue. Réessayez.',
  GOOGLE_CONFLICT:
    "Cette adresse est déjà rattachée à un autre compte Google. Utilisez le compte Google d'origine ou connectez-vous par email.",
  GOOGLE_UNVERIFIED:
    "Votre adresse n'est pas vérifiée chez Google. Vérifiez-la dans votre compte Google ou continuez par email.",
  GOOGLE_UNAVAILABLE:
    'La connexion avec Google est indisponible pour le moment. Continuez par email.',
  GOOGLE_FAILED: 'La connexion avec Google a échoué. Réessayez.',
};

export function ssoErrorMessageFromParam(value: string | null): string | null {
  return value !== null && isSsoErrorCode(value)
    ? SSO_ERROR_MESSAGES[value]
    : null;
}
