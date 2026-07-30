const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailErrorMessage(email: string): string | null {
  if (email.trim() === '') {
    return 'Adresse email requise';
  }
  return EMAIL_PATTERN.test(email) ? null : 'Adresse email invalide';
}
