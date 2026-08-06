import {
  ENERGY_PACK_PRICE_EUR,
  LEGAL_ACCOUNTING_RETENTION,
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
  LEGAL_PRICE_CHANGE_NOTICE_DAYS,
  LEGAL_REGISTRATION,
  LEGAL_TERMS_CHANGE_NOTICE_DAYS,
  LEGAL_VAT_MENTION,
  LEGAL_WITHDRAWAL_DAYS,
} from '@psychotech/shared';
import { formatEuroAmount } from '../../shared/util/format-euro';

export type LegalDocumentId =
  | 'mentions-legales'
  | 'confidentialite'
  | 'cgv'
  | 'cgu';

export interface LegalRun {
  text: string;
  todo?: boolean;
  href?: string;
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

function todo(text: string): LegalRun {
  return { text, todo: true };
}

function value(text: string, fallback: string): LegalRun {
  return text ? { text } : todo(fallback);
}

const HOSTING_REGION_SENTENCE: LegalRun = LEGAL_DATA_HOSTING_REGION
  ? { text: ` ${LEGAL_DATA_HOSTING_REGION}` }
  : todo(
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
            { text: 'Le site et l’application PsychoTech sont édités par ' },
            value(LEGAL_COMPANY.legalName, 'nom de l’éditeur'),
            { text: ', ' },
            value(LEGAL_COMPANY.legalForm, 'statut'),
            { text: '.' },
          ],
        },
        {
          kind: 'facts',
          rows: [
            {
              label: 'Adresse',
              value: value(LEGAL_COMPANY.headOfficeAddress, 'adresse complète'),
            },
            {
              label: 'Immatriculation',
              value: value(LEGAL_REGISTRATION, 'numéro d’immatriculation'),
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
            value(LEGAL_COMPANY.publicationDirector, 'prénom et nom'),
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
            value(
              LEGAL_HOSTING_PROVIDER.legalName,
              `${LEGAL_HOSTING_PROVIDER.name} — raison sociale`,
            ),
            { text: ', ' },
            value(
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
              text: 'Votre abonnement vous accorde un droit d’usage personnel, non exclusif et non transférable. Toute reproduction, capture, extraction, diffusion ou revente des énoncés d’exercices, notamment à des fins de constitution d’annales ou de formation concurrente, est interdite.',
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
              text: 'Le responsable du traitement de vos données personnelles est ',
            },
            value(LEGAL_COMPANY.legalName, 'nom de l’éditeur'),
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
              label: 'Abonnement',
              value: {
                text: `Formule en cours, dates de facturation, reçus et identifiant client ${LEGAL_PAYMENT_PROVIDER.name}. Les coordonnées bancaires sont traitées par notre prestataire de paiement et ne transitent jamais par nos serveurs.`,
              },
            },
            {
              label: 'Techniques',
              value: {
                text: 'Journaux de connexion, adresse IP, type d’appareil et de navigateur, à des fins de sécurité.',
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
              'Gérer l’abonnement, la facturation et les reçus',
              'Obligation légale',
            ],
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
            ['Pièces comptables et factures', LEGAL_ACCOUNTING_RETENTION],
            ['Journaux de connexion', LEGAL_CONNECTION_LOG_RETENTION],
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
              text: 'Vous pouvez demander la suppression de votre compte et de vos données en écrivant à ',
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

const CGV: LegalDocument = {
  id: 'cgv',
  path: '/cgv',
  tabLabel: 'CGV',
  title: 'Conditions générales de vente',
  metaDescription:
    'Offres, prix, paiement, reconduction, résiliation et droit de rétractation des abonnements PsychoTech.',
  sections: [
    {
      anchor: 'objet',
      title: 'Objet',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'Les présentes conditions régissent la souscription et l’utilisation des abonnements PsychoTech par tout consommateur majeur. La création d’un compte vaut acceptation sans réserve.',
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
              text: 'L’accès aux épreuves est régulé par une énergie quotidienne : un examen blanc complet consomme cinq énergies, un entraînement ciblé en consomme une. L’énergie se recharge chaque jour à minuit. La formule Illimité n’est pas soumise à cette limite.',
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
          head: ['Formule', 'Contenu', 'Prix TTC'],
          rows: [
            [
              'Découverte',
              'Mode découverte de chaque épreuve, sans évaluation',
              'Gratuit',
            ],
            [
              'Essentiel',
              'Cinq énergies par jour, bilans et progression complets',
              '8,99 €/mois',
            ],
            [
              'Illimité',
              'Énergie illimitée, sessions et entraînements sans restriction',
              '14,99 €/mois',
            ],
            [
              'Recharge',
              'Rétablit votre énergie du jour, réservé à la formule Essentiel',
              `${formatEuroAmount(ENERGY_PACK_PRICE_EUR)} €`,
            ],
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: `Les prix sont indiqués toutes taxes comprises, en euros. Toute évolution tarifaire vous est notifiée au moins ${LEGAL_PRICE_CHANGE_NOTICE_DAYS} jours à l’avance et ne s’applique qu’à compter de l’échéance suivante.`,
            },
          ],
        },
      ],
    },
    {
      anchor: 'paiement',
      title: 'Paiement, reconduction et résiliation',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'L’abonnement est mensuel, sans engagement de durée, prélevé le jour de la souscription puis à chaque date anniversaire par reconduction tacite.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Vous pouvez résilier à tout moment depuis vos réglages, sans frais ni justification. La résiliation prend effet à la fin de la période déjà payée : vous conservez l’accès jusque-là, puis votre compte revient à la formule Découverte. Un changement de formule prend effet à l’échéance suivante.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'En cas de défaut de paiement, l’accès aux formules payantes est suspendu après une relance restée sans effet.',
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
              text: `Vous disposez de ${LEGAL_WITHDRAWAL_DAYS} jours pour vous rétracter, sans motif. En demandant l’accès immédiat au service, vous reconnaissez que son exécution commence aussitôt : en cas de rétractation, la somme due est calculée au prorata de la période utilisée. La recharge d’énergie, exécutée immédiatement, n’ouvre pas droit à rétractation.`,
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
              text: 'Votre compte est strictement personnel : le partage d’identifiants, l’usage collectif et la revente d’accès sont interdits. Il en va de même de toute tentative d’extraction automatisée des contenus. Un manquement peut entraîner la suspension du compte, après information et sans remboursement des sommes échues.',
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
              text: `Nous mettons en œuvre les moyens raisonnables pour assurer la continuité du service, sans garantie d’absence d’interruption. Les maintenances programmées sont annoncées. Notre responsabilité est limitée aux dommages directs et prévisibles, dans la limite des sommes versées au titre des ${LEGAL_LIABILITY_WINDOW_MONTHS} derniers mois.`,
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
  path: '/cgu',
  tabLabel: 'Conditions d’utilisation',
  title: 'Conditions d’utilisation',
  metaDescription:
    'Ce que vous acceptez à l’inscription : accès au compte, usage loyal, propriété des contenus et valeur des évaluations.',
  sections: [
    {
      anchor: 'cgu',
      title: 'Ce que vous acceptez à l’inscription',
      blocks: [
        {
          kind: 'text',
          runs: [
            {
              text: 'En cochant la case « J’accepte les conditions d’utilisation » lors de la création de votre compte, vous acceptez le présent document. Il régit votre usage du service, indépendamment de tout paiement : les ',
            },
            { text: 'conditions générales de vente', href: '/cgv' },
            { text: ' s’y ajoutent dès que vous souscrivez une formule payante.' },
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
            'Vous entraîner autant que votre formule le permet, sur l’appareil de votre choix',
            'Prendre des notes personnelles à partir de vos bilans et de votre progression',
          ],
          forbidden: [
            'Partager vos identifiants, ouvrir le service à plusieurs candidats ou revendre un accès',
            'Capturer, recopier ou extraire les énoncés d’exercices, y compris de façon automatisée',
            'Fausser vos résultats par un outil tiers, une automatisation ou une manipulation du service',
            'Perturber le fonctionnement du service, en sonder les failles ou contourner la limite d’énergie',
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
              text: 'En cas de manquement aux règles ci-dessus, nous pouvons suspendre votre accès après vous en avoir informé, puis, si le manquement persiste ou s’il est grave, fermer votre compte. Les sommes déjà échues restent dues.',
            },
          ],
        },
        {
          kind: 'text',
          runs: [
            {
              text: 'Vous pouvez demander la fermeture de votre compte à tout moment en écrivant à ',
            },
            {
              text: LEGAL_CONTACT.privacy,
              href: `mailto:${LEGAL_CONTACT.privacy}`,
            },
            {
              text: `. Votre demande est traitée dans un délai maximum d’${LEGAL_DATA_REQUEST_MAX_DELAY} : elle supprime votre historique d’entraînement et met fin, le cas échéant, à votre abonnement selon les modalités des conditions de vente.`,
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
              text: 'Le service évolue : les exercices, les axes couverts et les secteurs proposés peuvent être ajoutés, modifiés ou retirés. Nous veillons à ce que ces évolutions ne réduisent pas les prestations essentielles de votre formule en cours.',
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

export function legalDocumentById(id: LegalDocumentId): LegalDocument {
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
