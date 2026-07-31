export const LEGAL_TERMS_VERSION = '2026-07-29';

export const LEGAL_LAST_UPDATED = '29 juillet 2026';

export const LEGAL_DOMAIN = 'psychotechtraining.com';

export interface LegalCompanyInfo {
  legalName: string;
  legalForm: string;
  shareCapitalEur: string;
  headOfficeAddress: string;
  registryCity: string;
  registryNumber: string;
  vatNumber: string;
  publicationDirector: string;
}

export const LEGAL_COMPANY: LegalCompanyInfo = {
  legalName: '',
  legalForm: '',
  shareCapitalEur: '',
  headOfficeAddress: '',
  registryCity: '',
  registryNumber: '',
  vatNumber: '',
  publicationDirector: '',
};

export interface LegalContactInfo {
  general: string;
  privacy: string;
  replyDelay: string;
}

export const LEGAL_CONTACT: LegalContactInfo = {
  general: `contact@${LEGAL_DOMAIN}`,
  privacy: `confidentialite@${LEGAL_DOMAIN}`,
  replyDelay: 'deux jours ouvrés',
};

export interface LegalProviderInfo {
  name: string;
  purpose: string;
  legalName: string;
  address: string;
}

export const LEGAL_HOSTING_PROVIDER: LegalProviderInfo = {
  name: 'Railway',
  purpose: 'Hébergement de l’application et de la base de données',
  legalName: '',
  address: '',
};

export const LEGAL_PAYMENT_PROVIDER: LegalProviderInfo = {
  name: 'Stripe',
  purpose: 'Traitement des paiements et de la facturation',
  legalName: '',
  address: '',
};

export const LEGAL_DNS_PROVIDER: LegalProviderInfo = {
  name: 'Cloudflare',
  purpose: 'Gestion du domaine et des DNS',
  legalName: '',
  address: '',
};

export const LEGAL_PROVIDERS: readonly LegalProviderInfo[] = [
  LEGAL_HOSTING_PROVIDER,
  LEGAL_PAYMENT_PROVIDER,
  LEGAL_DNS_PROVIDER,
];

export const LEGAL_DATA_HOSTING_REGION = '';

export const LEGAL_DATA_REQUEST_MAX_DELAY = 'un mois';

export const LEGAL_MEDIATOR_NAME = '';

export const LEGAL_MEDIATOR_CONTACT = '';

export const LEGAL_INACTIVE_ACCOUNT_RETENTION = '3 ans, après relance';

export const LEGAL_ACCOUNTING_RETENTION = '10 ans';

export const LEGAL_CONNECTION_LOG_RETENTION = '12 mois';

export const LEGAL_WITHDRAWAL_DAYS = 14;

export const LEGAL_PRICE_CHANGE_NOTICE_DAYS = 30;

export const LEGAL_TERMS_CHANGE_NOTICE_DAYS = 30;

export const LEGAL_LIABILITY_WINDOW_MONTHS = 12;
