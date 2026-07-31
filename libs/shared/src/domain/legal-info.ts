export const LEGAL_TERMS_VERSION = '2026-07-29';

export const LEGAL_LAST_UPDATED = '29 juillet 2026';

export const LEGAL_DOMAIN = 'psychotechtraining.com';

export interface LegalCompanyInfo {
  legalName: string;
  legalForm: string;
  headOfficeAddress: string;
  publicationDirector: string;
}

export const LEGAL_COMPANY: LegalCompanyInfo = {
  legalName: 'Mohand Boudjema',
  legalForm: 'Entrepreneur individuel (micro-entreprise)',
  headOfficeAddress: '3 chemin des Bessons, 13014 Marseille',
  publicationDirector: 'Mohand Boudjema',
};

export const LEGAL_REGISTRATION = 'SIREN 853 905 149';

// Franchise en base de TVA : aucun numéro intracommunautaire à publier.
export const LEGAL_VAT_MENTION = 'TVA non applicable, article 293 B du CGI';

export interface LegalContactInfo {
  general: string;
  privacy: string;
  replyDelay: string;
}

export const LEGAL_CONTACT: LegalContactInfo = {
  general: 'contact@mohandb.dev',
  privacy: 'contact@mohandb.dev',
  replyDelay: 'deux jours ouvrés',
};

export interface LegalProviderInfo {
  name: string;
  purpose: string;
}

export interface LegalHostingProviderInfo extends LegalProviderInfo {
  legalName: string;
  address: string;
}

export const LEGAL_HOSTING_PROVIDER: LegalHostingProviderInfo = {
  name: 'Railway',
  purpose: 'Hébergement de l’application et de la base de données',
  legalName:
    'Railway Corporation (société de droit de l’État du Delaware, États-Unis)',
  address:
    '548 Market St PMB 68956, San Francisco, California 94104, États-Unis',
};

export const LEGAL_PAYMENT_PROVIDER: LegalProviderInfo = {
  name: 'Stripe',
  purpose: 'Traitement des paiements et de la facturation',
};

export const LEGAL_DNS_PROVIDER: LegalProviderInfo = {
  name: 'Cloudflare',
  purpose: 'Gestion du domaine et des DNS',
};

// Le service ne dépose que des cookies strictement nécessaires (session, CSRF).
// Ajouter un pixel publicitaire ou un outil de mesure d'audience rendrait
// obligatoires une section cookies révisée ET un bandeau de consentement.
export const LEGAL_PROVIDERS: readonly LegalProviderInfo[] = [
  LEGAL_HOSTING_PROVIDER,
  LEGAL_PAYMENT_PROVIDER,
  LEGAL_DNS_PROVIDER,
];

// Phrase complète, insérée telle quelle dans les mentions légales.
// Véracité conditionnée à la signature du DPA Railway (railway.com/legal/dpa),
// qui intègre les clauses contractuelles types de la Commission européenne.
export const LEGAL_DATA_HOSTING_REGION =
  'Les données sont hébergées par Railway dans des centres de données situés aux États-Unis. Ce transfert hors de l’Union européenne est encadré par les clauses contractuelles types de la Commission européenne, intégrées à l’accord de traitement des données conclu avec l’hébergeur.';

export const LEGAL_DATA_REQUEST_MAX_DELAY = 'un mois';

export const LEGAL_INACTIVE_ACCOUNT_RETENTION = '3 ans, après relance';

export const LEGAL_ACCOUNTING_RETENTION = '10 ans';

export const LEGAL_CONNECTION_LOG_RETENTION = '12 mois';

export const LEGAL_WITHDRAWAL_DAYS = 14;

export const LEGAL_PRICE_CHANGE_NOTICE_DAYS = 30;

export const LEGAL_TERMS_CHANGE_NOTICE_DAYS = 30;

export const LEGAL_LIABILITY_WINDOW_MONTHS = 12;
