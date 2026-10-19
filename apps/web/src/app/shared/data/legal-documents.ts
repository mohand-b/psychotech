import {
  DELETE_ACCOUNT_CONFIRMATION,
  LEGAL_ACCOUNTING_RETENTION,
  LEGAL_ACCOUNT_DELETION_ANCHOR,
  LEGAL_APP_STORE_NAME,
  LEGAL_COMPANY,
  LEGAL_CONNECTION_LOG_RETENTION,
  LEGAL_CONTACT,
  LEGAL_DATA_HOSTING_REGION,
  LEGAL_DATA_REQUEST_MAX_DELAY,
  LEGAL_DNS_PROVIDER,
  LEGAL_HOSTING_PROVIDER,
  LEGAL_INACTIVE_ACCOUNT_RETENTION,
  LEGAL_LIABILITY_WINDOW_MONTHS,
  LEGAL_PAYMENT_PROVIDER,
  LEGAL_REGISTRATION,
  LEGAL_SUPPORT_MESSAGE_RETENTION,
  LEGAL_TERMS_CHANGE_NOTICE_DAYS,
  LEGAL_TERMS_OF_USE_PATH,
  LEGAL_VAT_MENTION,
  LEGAL_WITHDRAWAL_DAYS,
  SESSION_ENERGY_COST,
  SessionMode,
} from '@psychotech/shared';
import { SITE_NAME } from '../../core/seo/route-seo';
import { ENERGY_PACK_OFFERS } from '../util/energy-pack-offer';

export type LegalDocumentId =
  | 'mentions-legales'
  | 'confidentialite'
  | 'cgv'
  | 'cgu';

export interface LegalRun {
  text: string;
  todo?: boolean;
  href?: string;
  fragment?: string;
}

export type LegalBlock =
  | { kind: 'text'; runs: readonly LegalRun[] }
  | { kind: 'facts'; rows: readonly { label: string; value: LegalRun }[] }
  | {
      kind: 'grid';
      head: readonly [string, string, string?];
      rows: readonly (readonly [string, string, string?])[];
    }
  | { kind: 'rules'; allowed: readonly string[]; forbidden: readonly string[] };

export interface LegalSection {
  anchor: string;
  title: string;
  blocks: readonly LegalBlock[];
}

export interface LegalDocument {
  id: LegalDocumentId;
  path: string;
  tabLabel: string;
  title: string;
  metaDescription: string;
  sections: readonly LegalSection[];
}

function createTodoRun(text: string): LegalRun {
  return { text, todo: true };
}

const SITE_HOME_LINK: LegalRun = { text: SITE_NAME, href: '/' };

const RETAINED_DATA_ROWS: readonly (readonly [string, string])[] = [
  [
    `Justificatifs de paiement des achats, enregistrés chez ${LEGAL_PAYMENT_PROVIDER.name} ou ${LEGAL_APP_STORE_NAME}`,
    LEGAL_ACCOUNTING_RETENTION,
  ],
  [
    'Messages envoyés au support, avec l’adresse e-mail utilisée',
    LEGAL_SUPPORT_MESSAGE_RETENTION,
  ],
  ['Journaux techniques du service', LEGAL_CONNECTION_LOG_RETENTION],
];

const ACCOUNT_DELETION_LINK: LegalRun = {
  text: 'Suppression du compte',
  href: LEGAL_TERMS_OF_USE_PATH,
  fragment: LEGAL_ACCOUNT_DELETION_ANCHOR,
};

function createValueRunOrTodo(text: string, fallback: string): LegalRun {
  return text ? { text } : createTodoRun(fallback);
}

const HOSTING_REGION_SENTENCE: LegalRun = LEGAL_DATA_HOSTING_REGION
  ? { text: ` ${LEGAL_DATA_HOSTING_REGION}` }
  : createTodoRun(
      'Région d’hébergement des données à préciser, avec, le cas échéant, les garanties encadrant un transfert hors Union européenne.',
    );

const MENTIONS_LEGALES: LegalDocument = {
  id: 'mentions-legales',
  path: '/mentions-legales',
  tabLabel: 'Mentions légales',
  title: 'Mentions légales',
  metaDescription:
    'Éditeur, direction de la publication, hébergement et propriété intellectuelle du service d’entraînement PsychoTech.',
  sections: [
    {
      anchor: 'editeur',
      title: 'Éditeur du site',
      blocks: [
        {
          kind: 'text',
          runs: [
            { text: 'Le site et l’application ' },
            SITE_HOME_LINK,
            { text: ' sont édités par ' },
            createValueRunOrTodo(LEGAL_COMPANY.legalName, 'nom de l’éditeur'),
            { text: ', ' },
            createValueRunOrTodo(LEGAL_COMPANY.legalForm, 'statut'),
            { text: '.' },
          ],
        },
        {
          kind: 'facts',
          rows: [
            {
              label: 'Adresse',
              value: createValueRunOrTodo(
                LEGAL_COMPANY.headOfficeAddress,
                'adresse complète',
              ),
            },
            {
              label: 'Immatriculation',
              value: createValueRunOrTodo(
                LEGAL_REGISTRATION,
                'numéro d’immatriculation',
              ),
            },
            {
              label: 'TVA',
              value: { text: LEGAL_VAT_MENTION },
            },
            {
              label: 'Contact',
              value: {
                text: LEGAL_CONTACT.general,
                href: `mailto:${LEGAL_CONTACT.general}`,
              },
            },
          ],
        },
      ],
    },
    {
      anchor: 'publication',
      title: 'Direction de la publication',
      blocks: [
        {
          kind: 'text',
          runs: [
            { text: 'Le directeur de la publication est ' },
            createValueRunOrTodo(
              LEGAL_COMPANY.publicationDirector,
              'prénom et nom',
            ),
            {
              text: ', en qualité d’éditeur du site.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'hebergement',
      title: 'Hébergement',
      blocks: [
        {
          kind: 'text',
          runs: [
            { text: 'Le service est hébergé par ' },
            createValueRunOrTodo(
              LEGAL_HOSTING_PROVIDER.legalName,
              `${LEGAL_HOSTING_PROVIDER.name} — raison sociale`,
            ),
            { text: ', ' },
            createValueRunOrTodo(
              LEGAL_HOSTING_PROVIDER.address,
              `${LEGAL_HOSTING_PROVIDER.name} — adresse`,
            ),
            { text: '.' },
            HOSTING_REGION_SENTENCE,
          ],
        },
      ],
    },
    {
      anchor: 'propriete-intellectuelle',
      title: 'Propriété intellectuelle',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'L’ensemble du service, sa structure, ses textes, son identité visuelle, ses exercices et les énoncés qui les composent sont protégés par le droit de la propriété intellectuelle et demeurent la propriété exclusive de l’éditeur.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Votre compte vous ouvre un droit d’usage personnel, non exclusif et non transférable. Toute reproduction, capture, extraction, diffusion ou revente des énoncés d’exercices, notamment à des fins de constitution d’annales ou de formation concurrente, est interdite.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'nature-du-service',
      title: 'Nature du service',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'PsychoTech est un service d’entraînement privé. Il n’est ni affilié, ni mandaté, ni agréé par les opérateurs, les organismes de recrutement ou les cabinets qui organisent les épreuves de sélection. Les épreuves proposées sont des reconstitutions pédagogiques et ne constituent pas les épreuves officielles.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'droit-applicable',
      title: 'Droit applicable',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Les présentes mentions sont soumises au droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux français sont seuls compétents.',
            },
          ],
        },
      ],
    },
  ],
};

const CONFIDENTIALITE: LegalDocument = {
  id: 'confidentialite',
  path: '/confidentialite',
  tabLabel: 'Confidentialité',
  title: 'Politique de confidentialité',
  metaDescription:
    'Données collectées par PsychoTech, finalités, durées de conservation, sous-traitants et exercice de vos droits.',
  sections: [
    {
      anchor: 'responsable',
      title: 'Responsable du traitement',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Le responsable du traitement des données personnelles collectées sur ',
            },
            SITE_HOME_LINK,
            { text: ' est ' },
            createValueRunOrTodo(LEGAL_COMPANY.legalName, 'nom de l’éditeur'),
            { text: ', dont les coordonnées figurent dans les ' },
            { text: 'mentions légales', href: '/mentions-legales' },
            { text: '.' },
          ],
        },
      ],
    },
    {
      anchor: 'donnees-collectees',
      title: 'Données collectées',
      blocks: [
        {
          kind: 'facts',
          rows: [
            {
              label: 'Compte',
              value: {
                text: 'Prénom, nom, adresse e-mail, mot de passe chiffré, secteur de préparation, fuseau horaire.',
              },
            },
            {
              label: 'Entraînement',
              value: {
                text: 'Réponses saisies, temps de réponse, scores, avis de bilan et historique de vos sessions.',
              },
            },
            {
              label: 'Achats',
              value: {
                text: `Packs de crédits achetés, montants, dates, reçus et identifiant client ${LEGAL_PAYMENT_PROVIDER.name}, ou référence d’achat ${LEGAL_APP_STORE_NAME} pour un achat fait dans l’application Android. Les coordonnées bancaires ne transitent jamais par nos serveurs.`,
              },
            },
            {
              label: 'Communauté',
              value: {
                text: 'Prénom et badges obtenus, affichés dans le fil des obtentions visible des autres candidats. Vous pouvez vous retirer du fil à tout moment depuis votre profil.',
              },
            },
            {
              label: 'Support',
              value: {
                text: 'Messages envoyés depuis la page Contact, capture d’écran éventuelle et, sauf si vous décochez la case prévue, informations techniques : page concernée, navigateur, appareil et taille d’écran.',
              },
            },
            {
              label: 'Techniques',
              value: {
                text: 'Journaux techniques du service : adresse IP, type d’appareil et de navigateur, à des fins de sécurité.',
              },
            },
          ],
        },
      ],
    },
    {
      anchor: 'finalites',
      title: 'Finalités et bases légales',
      blocks: [
        {
          kind: 'grid',
          head: ['Finalité', 'Base légale'],
          rows: [
            [
              'Fournir le service, tenir votre progression et vos bilans',
              'Exécution du contrat',
            ],
            [
              'Traiter vos achats de crédits et vous envoyer vos reçus',
              'Exécution du contrat',
            ],
            ['Conserver les pièces comptables', 'Obligation légale'],
            [
              'Afficher le fil des obtentions de la communauté',
              'Intérêt légitime, avec retrait possible depuis le profil',
            ],
            ['Répondre à vos messages au support', 'Intérêt légitime'],
            [
              'Améliorer les exercices et la calibration du service, sur données agrégées',
              'Intérêt légitime',
            ],
          ],
        },
      ],
    },
    {
      anchor: 'vos-resultats',
      title: 'Vos résultats vous appartiennent',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Vos scores, vos avis de bilan et votre historique d’entraînement ne sont jamais communiqués à un employeur, un recruteur, un centre d’examen ou un tiers commercial. Ils ne servent qu’à vous restituer votre progression.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'sous-traitants',
      title: 'Destinataires et sous-traitants',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Nous faisons appel aux seuls prestataires nécessaires au fonctionnement du service. Chacun agit sur instruction, dans le cadre d’un contrat de sous-traitance conforme au RGPD.',
            },
          ],
        },
        {
          kind: 'grid',
          head: ['Prestataire', 'Rôle'],
          rows: [
            [LEGAL_HOSTING_PROVIDER.name, LEGAL_HOSTING_PROVIDER.purpose],
            [LEGAL_PAYMENT_PROVIDER.name, LEGAL_PAYMENT_PROVIDER.purpose],
            [LEGAL_DNS_PROVIDER.name, LEGAL_DNS_PROVIDER.purpose],
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: `Les achats faits dans l’application Android sont traités par ${LEGAL_APP_STORE_NAME}, selon sa propre politique de confidentialité.`,
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Vos données ne sont ni vendues, ni louées, ni cédées à des fins publicitaires.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'conservation',
      title: 'Durées de conservation',
      blocks: [
        {
          kind: 'grid',
          head: ['Donnée', 'Durée'],
          rows: [
            [
              'Compte et données d’entraînement',
              'Jusqu’à la suppression du compte',
            ],
            ['Compte inactif', LEGAL_INACTIVE_ACCOUNT_RETENTION],
            ...RETAINED_DATA_ROWS,
          ],
        },
      ],
    },
    {
      anchor: 'vos-droits',
      title: 'Vos droits',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et de portabilité de vos données, ainsi que du droit de retirer votre consentement à tout moment.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Vous pouvez supprimer votre compte et vos données à tout moment depuis votre profil, comme l’explique la section ',
            },
            ACCOUNT_DELETION_LINK,
            {
              text: ' des conditions d’utilisation, ou en faire la demande en écrivant à ',
            },
            {
              text: LEGAL_CONTACT.privacy,
              href: `mailto:${LEGAL_CONTACT.privacy}`,
            },
            {
              text: `. Votre demande est traitée dans un délai maximum d’${LEGAL_DATA_REQUEST_MAX_DELAY}. Vous pouvez également introduire une réclamation auprès de la CNIL.`,
            },
          ],
        },
      ],
    },
    {
      anchor: 'cookies',
      title: 'Cookies et sécurité',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Le service dépose uniquement les cookies strictement nécessaires à son fonctionnement : le cookie de session qui vous maintient authentifié et le cookie de protection contre la falsification de requête. Ils ne servent ni à la mesure d’audience, ni à la publicité, ni au suivi entre sites.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Ces cookies étant indispensables au service que vous demandez, ils ne requièrent pas votre consentement préalable et aucun bandeau ne vous est présenté.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Les échanges sont chiffrés en transit, les mots de passe sont stockés sous forme de condensats et les accès internes sont limités aux personnes habilitées.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'modifications-confidentialite',
      title: 'Modification de cette politique',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Toute modification est publiée sur cette page, avec mise à jour de la date en tête de document. Nous vous invitons à la consulter régulièrement.',
            },
          ],
        },
      ],
    },
  ],
};

const PACK_PRICE_ROWS: readonly (readonly [string, string, string])[] =
  ENERGY_PACK_OFFERS.map((offer) => [
    `Pack ${offer.title}`,
    `${offer.credits} crédits, soit ${offer.examCountLabel} ou ${offer.targetedCountLabel}`,
    offer.priceLabel,
  ]);

const CGV: LegalDocument = {
  id: 'cgv',
  path: '/cgv',
  tabLabel: 'CGV',
  title: 'Conditions générales de vente',
  metaDescription:
    'Packs de crédits, prix, paiement et droit de rétractation des achats sur PsychoTech.',
  sections: [
    {
      anchor: 'objet',
      title: 'Objet',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Les présentes conditions régissent l’achat de packs de crédits sur ',
            },
            SITE_HOME_LINK,
            {
              text: ' par tout consommateur majeur. Tout achat vaut acceptation sans réserve des présentes conditions.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'le-service',
      title: 'Le service',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'PsychoTech donne accès à des examens blancs complets et à des entraînements ciblés sur les axes de votre secteur, ainsi qu’au suivi de votre progression. Le secteur de préparation est un attribut de votre compte, choisi à l’inscription.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: `L’accès aux épreuves est régulé par des crédits : un examen blanc complet en consomme ${SESSION_ENERGY_COST[SessionMode.FULL]}, un entraînement ciblé ${SESSION_ENERGY_COST[SessionMode.TARGETED]}. Les crédits s’achètent par packs à paiement unique, sans abonnement, et n’expirent pas. Des crédits sont aussi offerts à l’inscription, par certains badges et par les codes cadeaux.`,
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Les crédits sont rattachés à votre compte : ils ne peuvent être ni cédés, ni convertis en argent. Ils sont utilisables sur tous vos appareils, sur le site comme dans l’application.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'offres-et-prix',
      title: 'Offres et prix',
      blocks: [
        {
          kind: 'grid',
          head: ['Offre', 'Contenu', 'Prix'],
          rows: [
            [
              'Mode découverte',
              'Découverte de chaque épreuve, sans évaluation',
              'Gratuit',
            ],
            ...PACK_PRICE_ROWS,
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: `Les prix sont indiqués en euros. ${LEGAL_VAT_MENTION}. Le prix applicable est celui affiché au moment de l’achat.`,
            },
          ],
        },
      ],
    },
    {
      anchor: 'paiement',
      title: 'Paiement',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: `Les achats se font en une seule fois. Sur le site, ils passent par notre prestataire de paiement ${LEGAL_PAYMENT_PROVIDER.name}. Dans l’application Android, ils passent par le système de paiement de ${LEGAL_APP_STORE_NAME}, aux prix qu’il affiche. Aucun abonnement ni prélèvement récurrent n’est mis en place.`,
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Les crédits sont ajoutés à votre solde dès la confirmation du paiement, et un reçu vous est envoyé par e-mail. Les reçus des achats faits sur le site restent consultables depuis votre profil.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'retractation',
      title: 'Droit de rétractation',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: `Le délai légal de rétractation est de ${LEGAL_WITHDRAWAL_DAYS} jours. Les crédits étant un contenu numérique fourni dès la confirmation du paiement, à votre demande, ce droit ne s’applique plus une fois les crédits ajoutés à votre solde, conformément à l’article L221-28 du Code de la consommation.`,
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: `Le remboursement d’un achat fait dans l’application Android relève des règles de ${LEGAL_APP_STORE_NAME}. S’il est accordé, les crédits correspondants sont retirés du solde.`,
            },
          ],
        },
      ],
    },
    {
      anchor: 'absence-de-garantie',
      title: 'Absence de garantie de résultat',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'PsychoTech est un outil de préparation. Les scores et les avis affichés sont des indicateurs pédagogiques, sans valeur officielle, et ne préjugent en rien du résultat de vos épreuves réelles. Aucune garantie de réussite, d’admissibilité ou d’embauche n’est consentie.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'vos-obligations',
      title: 'Vos obligations',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Votre compte est strictement personnel : le partage d’identifiants, l’usage collectif et la revente d’accès sont interdits. Il en va de même de toute tentative d’extraction automatisée des contenus. Un manquement peut entraîner la suspension du compte, après information, sans remboursement des crédits non utilisés.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'disponibilite',
      title: 'Disponibilité et responsabilité',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: `Nous mettons en œuvre les moyens raisonnables pour assurer la continuité du service, sans garantie d’absence d’interruption. Les maintenances programmées sont annoncées. Notre responsabilité est limitée aux dommages directs et prévisibles, dans la limite des sommes que vous avez versées au cours des ${LEGAL_LIABILITY_WINDOW_MONTHS} derniers mois.`,
            },
          ],
        },
      ],
    },
    {
      anchor: 'reclamation',
      title: 'Réclamation',
      blocks: [
        {
          kind: 'text',
          runs: [
            { text: 'Toute réclamation peut être adressée à ' },
            {
              text: LEGAL_CONTACT.general,
              href: `mailto:${LEGAL_CONTACT.general}`,
            },
            {
              text: '. Les présentes conditions sont soumises au droit français.',
            },
          ],
        },
      ],
    },
  ],
};

const CGU: LegalDocument = {
  id: 'cgu',
  path: LEGAL_TERMS_OF_USE_PATH,
  tabLabel: 'Conditions d’utilisation',
  title: 'Conditions d’utilisation',
  metaDescription:
    'Ce que vous acceptez à l’inscription : accès au compte, usage loyal, propriété des contenus, valeur des évaluations et suppression du compte.',
  sections: [
    {
      anchor: 'cgu',
      title: 'Ce que vous acceptez à l’inscription',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'En cochant la case « J’accepte les conditions d’utilisation » lors de la création de votre compte, vous acceptez le présent document. Il régit votre usage de ',
            },
            SITE_HOME_LINK,
            {
              text: ', indépendamment de tout paiement : les ',
            },
            { text: 'conditions générales de vente', href: '/cgv' },
            {
              text: ' s’y ajoutent dès que vous achetez des crédits.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: `La case n’est pas pré-cochée et la création du compte n’est possible qu’une fois cochée. Toute modification substantielle est publiée sur cette page, avec mise à jour de la date en tête de document, au moins ${LEGAL_TERMS_CHANGE_NOTICE_DAYS} jours avant son entrée en vigueur. Nous vous invitons à la consulter régulièrement.`,
            },
          ],
        },
      ],
    },
    {
      anchor: 'acces-au-compte',
      title: 'Accès au compte',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Le service est réservé aux personnes majeures. Vous vous engagez à fournir des informations exactes et à les tenir à jour, notamment votre adresse e-mail, qui sert à sécuriser votre compte.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Votre compte est strictement personnel. Vous êtes responsable de la confidentialité de votre mot de passe et des actions réalisées depuis votre session. Prévenez-nous sans délai en cas d’usage non autorisé.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'usage-loyal',
      title: 'Un usage loyal du service',
      blocks: [
        {
          kind: 'rules',
          allowed: [
            'Vous entraîner autant que vos crédits le permettent, sur l’appareil de votre choix',
            'Prendre des notes personnelles à partir de vos bilans et de votre progression',
          ],
          forbidden: [
            'Partager vos identifiants, ouvrir le service à plusieurs candidats ou revendre un accès',
            'Capturer, recopier ou extraire les énoncés d’exercices, y compris de façon automatisée',
            'Fausser vos résultats par un outil tiers, une automatisation ou une manipulation du service',
            'Perturber le fonctionnement du service, en sonder les failles ou contourner le décompte de crédits',
          ],
        },
      ],
    },
    {
      anchor: 'contenus-et-resultats',
      title: 'Contenus et résultats',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Les exercices, énoncés, corrigés et supports restent la propriété de l’éditeur. Votre inscription vous ouvre un droit d’usage personnel, non exclusif et non transférable, pour la seule durée de votre compte.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Vos réponses, scores et bilans vous appartiennent : vous pouvez en demander l’export ou la suppression en écrivant à ',
            },
            {
              text: LEGAL_CONTACT.privacy,
              href: `mailto:${LEGAL_CONTACT.privacy}`,
            },
            { text: '. Leur traitement est décrit dans la ' },
            { text: 'politique de confidentialité', href: '/confidentialite' },
            { text: '.' },
          ],
        },
      ],
    },
    {
      anchor: 'valeur-des-evaluations',
      title: 'Valeur des évaluations',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Les scores et les avis restitués sont des repères d’entraînement, sans valeur officielle ni certificative. Ils ne peuvent être produits comme attestation auprès d’un employeur, d’un organisme de recrutement ou d’un centre d’examen.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'suspension',
      title: 'Suspension et fermeture du compte',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'En cas de manquement aux règles ci-dessus, nous pouvons suspendre votre accès après vous en avoir informé, puis, si le manquement persiste ou s’il est grave, fermer votre compte. Les crédits non utilisés ne sont pas remboursés.',
            },
          ],
        },
      ],
    },
    {
      anchor: LEGAL_ACCOUNT_DELETION_ANCHOR,
      title: 'Suppression du compte',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: `Vous pouvez supprimer à tout moment votre compte ${SITE_NAME}, sur le site comme dans l’application : connectez-vous, ouvrez votre profil, puis choisissez « Supprimer » dans l’encadré « Supprimer mon compte » de la rubrique Informations.`,
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: `Saisissez le mot ${DELETE_ACCOUNT_CONFIRMATION}, ainsi que votre mot de passe si votre compte en possède un, puis validez avec « Supprimer définitivement ». La suppression est immédiate et définitive.`,
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            { text: 'Sans accès à votre compte, écrivez à ' },
            {
              text: LEGAL_CONTACT.privacy,
              href: `mailto:${LEGAL_CONTACT.privacy}`,
            },
            {
              text: ` depuis l’adresse e-mail de votre compte, en demandant sa suppression. Votre demande est traitée dans un délai maximum d’${LEGAL_DATA_REQUEST_MAX_DELAY}.`,
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'La suppression efface votre compte et les données qui lui sont rattachées : prénom, nom, adresse e-mail, mot de passe, sessions, réponses, scores et bilans, badges, crédits restants et historique de vos achats. Seules les données suivantes sont conservées :',
            },
          ],
        },
        {
          kind: 'grid',
          head: ['Donnée conservée', 'Durée'],
          rows: RETAINED_DATA_ROWS,
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Ces données sont conservées pour respecter des obligations légales, répondre à d’éventuelles réclamations et assurer la sécurité du service. Elles ne servent à aucune autre fin.',
            },
          ],
        },
      ],
    },
    {
      anchor: 'evolution',
      title: 'Évolution du service',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Le service évolue : les exercices, les axes couverts et les secteurs proposés peuvent être ajoutés, modifiés ou retirés. Nous veillons à ce que ces évolutions ne remettent pas en cause l’usage des crédits déjà acquis.',
            },
          ],
        },
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: readonly LegalDocument[] = [
  MENTIONS_LEGALES,
  CONFIDENTIALITE,
  CGV,
  CGU,
];

export function getLegalDocument(id: LegalDocumentId): LegalDocument {
  const document = LEGAL_DOCUMENTS.find((entry) => entry.id === id);
  if (!document) {
    throw new Error(`Unknown legal document: ${id}`);
  }
  return document;
}

export function legalDocumentHasTodo(document: LegalDocument): boolean {
  return document.sections.some((section) =>
    section.blocks.some((block) =>
      block.kind === 'text'
        ? block.runs.some((run) => run.todo)
        : block.kind === 'facts'
          ? block.rows.some((row) => row.value.todo)
          : false,
    ),
  );
}
