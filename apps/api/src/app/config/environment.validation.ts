const REQUIRED_ENVIRONMENT_VARIABLES = ['DATABASE_URL', 'DIRECT_URL'] as const;

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const missing = REQUIRED_ENVIRONMENT_VARIABLES.filter((key) => {
    const value = environment[key];
    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement requises manquantes ou vides : ${missing.join(', ')}`,
    );
  }

  return environment;
}
