export function passwordsMatch(password: string, confirmation: string): boolean {
  return confirmation.length > 0 && password === confirmation;
}
