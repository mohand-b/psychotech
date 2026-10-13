import { registerAs } from '@nestjs/config';
import { GOOGLE_PLAY_PACKAGE_NAME } from '@psychotech/shared';
import { readOptional } from './environment.readers';

export interface GooglePlayServiceAccount {
  clientEmail: string;
  privateKey: string;
}

export interface GooglePlayConfig {
  packageName: string;
  serviceAccount: GooglePlayServiceAccount | null;
}

interface ServiceAccountKeyFile {
  client_email?: unknown;
  private_key?: unknown;
}

function readServiceAccount(): GooglePlayServiceAccount | null {
  const keyFile = readOptional('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  if (!keyFile) {
    return null;
  }
  const parsed = JSON.parse(keyFile) as ServiceAccountKeyFile;
  if (
    typeof parsed.client_email !== 'string' ||
    typeof parsed.private_key !== 'string'
  ) {
    throw new Error(
      'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON must contain client_email and private_key',
    );
  }
  return { clientEmail: parsed.client_email, privateKey: parsed.private_key };
}

export const googlePlayConfig = registerAs(
  'googlePlay',
  (): GooglePlayConfig => ({
    packageName:
      readOptional('GOOGLE_PLAY_PACKAGE_NAME') ?? GOOGLE_PLAY_PACKAGE_NAME,
    serviceAccount: readServiceAccount(),
  }),
);
