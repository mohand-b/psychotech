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
import { SelectOption } from '../../shared/ui/select/select';
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

export const CONTACT_AREA_PLACEHOLDER = 'Choisir';

export const CONTACT_AREA_OPTIONS: SelectOption<ContactSuggestionArea>[] = [
  { value: ContactSuggestionArea.EXERCISE, label: 'Une épreuve' },
  { value: ContactSuggestionArea.RESULTS, label: 'Bilans et résultats' },
  { value: ContactSuggestionArea.BADGES, label: 'Badges' },
  { value: ContactSuggestionArea.CREDITS, label: 'Crédits' },
  { value: ContactSuggestionArea.OTHER, label: 'Autre' },
];

export const CONTACT_LOCATION_PLACEHOLDER = 'Page ou épreuve';

export const CONTACT_LOCATION_OPTIONS: ContactOption<ContactProblemLocation>[] =
  [
    {
      value: ContactProblemLocation.EXAM,
      label: { desktop: 'Examen blanc', mobile: 'Examen blanc' },
    },
    {
      value: ContactProblemLocation.TARGETED_SESSION,
      label: { desktop: 'Session ciblée', mobile: 'Session ciblée' },
    },
    {
      value: ContactProblemLocation.RESULTS,
      label: { desktop: 'Bilan ou résultat', mobile: 'Bilan ou résultat' },
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
