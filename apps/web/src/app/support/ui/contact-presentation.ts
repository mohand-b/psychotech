import {
  ContactProblemLocation,
  ContactSuggestionArea,
} from '@psychotech/shared';
import {
  Lightbulb,
  LucideIconData,
  MessageCircleQuestionMark,
  TriangleAlert,
} from 'lucide-angular';
import { ContactMotif } from '../../shared/util/contact-link';

export const DEFAULT_CONTACT_MOTIF: ContactMotif = 'question';

interface ResponsiveText {
  desktop: string;
  mobile: string;
}

export interface ContactMotifPresentation {
  id: ContactMotif;
  label: string;
  icon: LucideIconData;
  inkVar: string;
  title: string;
  subtitle: ResponsiveText;
  messageLabel: string;
  messagePlaceholder: ResponsiveText;
}

export const CONTACT_MOTIFS: ContactMotifPresentation[] = [
  {
    id: 'question',
    label: 'Question',
    icon: MessageCircleQuestionMark,
    inkVar: 'var(--axis-logic)',
    title: 'Poser une question',
    subtitle: {
      desktop: "Sur l'application, les épreuves ou les crédits.",
      mobile: "Sur l'application, les épreuves ou les crédits.",
    },
    messageLabel: 'Votre question',
    messagePlaceholder: {
      desktop: 'Décrivez votre question le plus précisément possible.',
      mobile: 'Décrivez votre question le plus précisément possible.',
    },
  },
  {
    id: 'suggestion',
    label: 'Suggestion',
    icon: Lightbulb,
    inkVar: 'var(--axis-reactivity)',
    title: 'Proposer une amélioration',
    subtitle: {
      desktop: 'Une idée pour rendre PsychoTech plus utile.',
      mobile: 'Une idée pour rendre PsychoTech plus utile.',
    },
    messageLabel: 'Votre suggestion',
    messagePlaceholder: {
      desktop: "Qu'aimeriez-vous voir changer ou apparaître, et pourquoi ?",
      mobile: "Qu'aimeriez-vous voir changer ou apparaître, et pourquoi ?",
    },
  },
  {
    id: 'probleme',
    label: 'Signaler un problème',
    icon: TriangleAlert,
    inkVar: 'var(--axis-motor)',
    title: 'Signaler un problème',
    subtitle: {
      desktop:
        "Un bug, une erreur ou un blocage. Plus c'est précis, plus vite c'est corrigé.",
      mobile: 'Un bug, une erreur ou un blocage.',
    },
    messageLabel: "Que s'est-il passé ?",
    messagePlaceholder: {
      desktop:
        "Ce que vous faisiez, ce qui devait se passer, ce qui s'est passé. Le navigateur ou l'appareil aide aussi.",
      mobile:
        "Ce que vous faisiez, ce qui devait se passer, ce qui s'est passé.",
    },
  },
];

export function isContactMotif(value: string | null): value is ContactMotif {
  return CONTACT_MOTIFS.some((motif) => motif.id === value);
}

export interface ContactOption<Value extends string> {
  value: Value;
  label: ResponsiveText;
}

export const CONTACT_AREA_OPTIONS: ContactOption<ContactSuggestionArea>[] = [
  {
    value: ContactSuggestionArea.EXERCISE,
    label: { desktop: 'Une épreuve', mobile: 'Une épreuve' },
  },
  {
    value: ContactSuggestionArea.RESULTS,
    label: { desktop: 'Bilans et résultats', mobile: 'Bilans' },
  },
  {
    value: ContactSuggestionArea.BADGES,
    label: { desktop: 'Badges', mobile: 'Badges' },
  },
  {
    value: ContactSuggestionArea.CREDITS,
    label: { desktop: 'Crédits', mobile: 'Crédits' },
  },
  {
    value: ContactSuggestionArea.OTHER,
    label: { desktop: 'Autre', mobile: 'Autre' },
  },
];

export const CONTACT_LOCATION_OPTIONS: ContactOption<ContactProblemLocation>[] =
  [
    {
      value: ContactProblemLocation.EXAM,
      label: { desktop: 'Examen blanc', mobile: 'Pendant un examen blanc' },
    },
    {
      value: ContactProblemLocation.TARGETED_SESSION,
      label: {
        desktop: 'Session ciblée',
        mobile: 'Pendant une session ciblée',
      },
    },
    {
      value: ContactProblemLocation.RESULTS,
      label: {
        desktop: 'Bilan ou résultat',
        mobile: 'Sur un bilan ou un résultat',
      },
    },
    {
      value: ContactProblemLocation.CREDITS_OR_PAYMENT,
      label: { desktop: 'Crédits ou paiement', mobile: 'Crédits ou paiement' },
    },
    {
      value: ContactProblemLocation.ACCOUNT,
      label: {
        desktop: 'Compte, connexion, email',
        mobile: 'Compte, connexion ou email',
      },
    },
    {
      value: ContactProblemLocation.ELSEWHERE,
      label: { desktop: 'Ailleurs', mobile: 'Ailleurs' },
    },
  ];

export const CONTACT_LOCATION_PLACEHOLDER: ResponsiveText = {
  desktop: 'Page ou épreuve',
  mobile: 'Choisir',
};
