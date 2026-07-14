const NODE_ENVIRONMENTS = ['development', 'test', 'production'] as const;

export type NodeEnvironment = (typeof NODE_ENVIRONMENTS)[number];

const DEFAULT_NODE_ENVIRONMENT: NodeEnvironment = 'development';

const REQUIRED_ENVIRONMENT_VARIABLES = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
] as const;

const DEVELOPMENT_REQUIRED_ENVIRONMENT_VARIABLES = ['CORS_ORIGIN'] as const;

export function validateEnvironment(
  environment: Record<string, unknown>,
): Record<string, unknown> {
  const nodeEnvironment = readNodeEnvironment(environment);
  const required: readonly string[] =
    nodeEnvironment === 'production'
      ? REQUIRED_ENVIRONMENT_VARIABLES
      : [
          ...REQUIRED_ENVIRONMENT_VARIABLES,
          ...DEVELOPMENT_REQUIRED_ENVIRONMENT_VARIABLES,
        ];
  const missing = required.filter((key) => isBlank(environment[key]));

  if (missing.length > 0) {
    throw new Error(
      `Variables d'environnement requises manquantes ou vides : ${missing.join(', ')}`,
    );
  }

  if (nodeEnvironment === 'production' && environment['COOKIE_SECURE'] === 'false') {
    throw new Error(
      'COOKIE_SECURE ne peut pas être désactivé quand NODE_ENV vaut production',
    );
  }

  return { ...environment, NODE_ENV: nodeEnvironment };
}

function readNodeEnvironment(
  environment: Record<string, unknown>,
): NodeEnvironment {
  const value = environment['NODE_ENV'];
  if (isBlank(value)) {
    return DEFAULT_NODE_ENVIRONMENT;
  }
  if (!NODE_ENVIRONMENTS.includes(value as NodeEnvironment)) {
    throw new Error(
      `NODE_ENV doit valoir l'une des valeurs suivantes : ${NODE_ENVIRONMENTS.join(', ')}`,
    );
  }
  return value as NodeEnvironment;
}

function isBlank(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}
