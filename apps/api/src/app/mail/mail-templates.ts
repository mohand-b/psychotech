import { PASSWORD_RESET_TTL_MINUTES } from '@psychotech/shared';

export interface VerificationEmailInput {
  firstName: string;
  email: string;
  link: string;
  variant: 'signup' | 'email-change';
  baseUrl: string;
}

export interface NoticeEmailInput {
  firstName: string;
  title: string;
  paragraphs: string[];
  baseUrl: string;
}

export interface PasswordResetEmailInput {
  firstName: string;
  email: string;
  link: string;
  variant: 'reset' | 'define';
  baseUrl: string;
}

interface EmailContent {
  title: string;
  intro: string;
  body: string;
  cta: { label: string; link: string } | null;
  afterCta: string | null;
  fallbackLink: string | null;
  outro: string;
  baseUrl: string;
}

const INK = '#1B2130';
const SECONDARY = '#5B6472';
const MUTED = '#8A94A6';
const FOOT = '#A6AFBE';
const DIVIDER = '#F0F2F5';
const BRAND = '#7C5CFC';
const LINK = '#6A4BEA';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderHtml(content: EmailContent): string {
  const rows: string[] = [];
  const text = (html: string, style: string) =>
    rows.push(`<tr><td style="${style}">${html}</td></tr>`);
  const spacer = (height: number) =>
    rows.push(
      `<tr><td style="height: ${height}px; line-height: ${height}px; font-size: 0;">&nbsp;</td></tr>`,
    );
  const divider = () =>
    rows.push(
      `<tr><td style="border-top: 1px solid ${DIVIDER}; height: 1px; line-height: 1px; font-size: 0;">&nbsp;</td></tr>`,
    );

  text(
    `Psycho<span style="color: ${BRAND};">Tech</span>`,
    `font-family: Arial, Helvetica, sans-serif; font-size: 21px; font-weight: 700; color: ${INK}; padding-bottom: 24px;`,
  );
  text(
    escapeHtml(content.title),
    `font-family: Arial, Helvetica, sans-serif; font-size: 23px; line-height: 1.25; font-weight: 700; color: ${INK}; padding-bottom: 16px;`,
  );
  text(
    escapeHtml(content.intro),
    `font-family: Arial, Helvetica, sans-serif; font-size: 14.5px; line-height: 1.65; color: ${SECONDARY}; padding-bottom: 16px;`,
  );
  text(
    content.body,
    `font-family: Arial, Helvetica, sans-serif; font-size: 14.5px; line-height: 1.65; color: ${SECONDARY}; padding-bottom: 16px;`,
  );
  if (content.cta) {
    rows.push(
      `<tr><td style="padding: 8px 0 2px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background: ${BRAND}; border-radius: 11px;"><a href="${content.cta.link}" style="display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 600; color: #FFFFFF; text-decoration: none; padding: 14px 28px;">${escapeHtml(content.cta.label)}</a></td></tr></table></td></tr>`,
    );
    spacer(12);
  }
  if (content.afterCta) {
    text(
      escapeHtml(content.afterCta),
      `font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; color: ${MUTED}; padding-bottom: 16px;`,
    );
  }
  if (content.fallbackLink) {
    divider();
    spacer(16);
    text(
      'Le bouton ne fonctionne pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:',
      `font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; line-height: 1.6; color: ${MUTED}; padding-bottom: 8px;`,
    );
    text(
      `<a href="${content.fallbackLink}" style="color: ${LINK}; word-break: break-all; text-decoration: none;">${escapeHtml(content.fallbackLink)}</a>`,
      `font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.6; padding-bottom: 16px;`,
    );
  }
  text(
    escapeHtml(content.outro),
    `font-family: Arial, Helvetica, sans-serif; font-size: 12.5px; line-height: 1.6; color: ${MUTED}; padding-bottom: 16px;`,
  );
  divider();
  spacer(14);
  text(
    'PsychoTech · Préparation aux tests psychotechniques',
    `font-family: Arial, Helvetica, sans-serif; font-size: 11.5px; color: ${FOOT}; padding-bottom: 10px;`,
  );
  text(
    `<a href="${content.baseUrl}/mentions-legales" style="color: ${FOOT}; text-decoration: none;">Mentions légales</a>&nbsp;&nbsp;&nbsp;<a href="${content.baseUrl}/confidentialite" style="color: ${FOOT}; text-decoration: none;">Confidentialité</a>`,
    `font-family: Arial, Helvetica, sans-serif; font-size: 11.5px;`,
  );

  return [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>',
    '<body style="margin: 0; padding: 0; background: #FFFFFF;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td>',
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;"><tr><td style="padding: 40px 32px 48px;">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">',
    rows.join(''),
    '</table></td></tr></table></td></tr></table></body></html>',
  ].join('');
}

function renderText(content: EmailContent, plainBody: string): string {
  const lines = [content.title, '', content.intro, '', plainBody, ''];
  if (content.cta && content.fallbackLink) {
    lines.push(`${content.cta.label} : ${content.fallbackLink}`, '');
  }
  if (content.afterCta) {
    lines.push(content.afterCta, '');
  }
  lines.push(content.outro, '', 'PsychoTech · Préparation aux tests psychotechniques');
  return lines.join('\n');
}

export function buildVerificationEmail(input: VerificationEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const signup = input.variant === 'signup';
  const content: EmailContent = {
    title: 'Confirmez votre adresse email',
    intro: `Bonjour ${input.firstName},`,
    body: signup
      ? `Bienvenue sur PsychoTech. Pour activer votre compte, confirmez que l'adresse <span style="font-weight: 600; color: ${INK};">${escapeHtml(input.email)}</span> est bien la vôtre.`
      : `Vous avez demandé à utiliser l'adresse <span style="font-weight: 600; color: ${INK};">${escapeHtml(input.email)}</span> pour votre compte PsychoTech. Confirmez qu'elle est bien la vôtre pour finaliser le changement.`,
    cta: { label: 'Vérifier mon adresse', link: input.link },
    afterCta: 'Ce lien est valable 24 heures.',
    fallbackLink: input.link,
    outro:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : aucune action ne sera effectuée.",
    baseUrl: input.baseUrl,
  };
  const plainBody = signup
    ? `Bienvenue sur PsychoTech. Pour activer votre compte, confirmez que l'adresse ${input.email} est bien la vôtre.`
    : `Vous avez demandé à utiliser l'adresse ${input.email} pour votre compte PsychoTech. Confirmez qu'elle est bien la vôtre pour finaliser le changement.`;
  return {
    subject: signup
      ? 'Confirmez votre adresse email'
      : 'Confirmez votre nouvelle adresse email',
    html: renderHtml(content),
    text: renderText(content, plainBody),
  };
}

export function buildPasswordResetEmail(input: PasswordResetEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const define = input.variant === 'define';
  const emailHtml = `<span style="font-weight: 600; color: ${INK};">${escapeHtml(input.email)}</span>`;
  const content: EmailContent = {
    title: define
      ? 'Définissez votre mot de passe'
      : 'Réinitialisez votre mot de passe',
    intro: `Bonjour ${input.firstName},`,
    body: define
      ? `Votre compte PsychoTech ${emailHtml} se connecte aujourd'hui avec Google. Définissez un mot de passe pour pouvoir aussi vous connecter sans passer par Google : les deux méthodes fonctionneront ensuite sur ce même compte.`
      : `Vous avez demandé à réinitialiser le mot de passe du compte PsychoTech ${emailHtml}. Choisissez-en un nouveau pour retrouver votre accès.`,
    cta: {
      label: define ? 'Définir mon mot de passe' : 'Choisir un nouveau mot de passe',
      link: input.link,
    },
    afterCta: `Ce lien est valable ${PASSWORD_RESET_TTL_MINUTES} minutes et ne peut servir qu'une seule fois.`,
    fallbackLink: input.link,
    outro:
      "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe actuel reste valable et aucune action ne sera effectuée.",
    baseUrl: input.baseUrl,
  };
  const plainBody = define
    ? `Votre compte PsychoTech ${input.email} se connecte aujourd'hui avec Google. Définissez un mot de passe pour pouvoir aussi vous connecter sans passer par Google : les deux méthodes fonctionneront ensuite sur ce même compte.`
    : `Vous avez demandé à réinitialiser le mot de passe du compte PsychoTech ${input.email}. Choisissez-en un nouveau pour retrouver votre accès.`;
  return {
    subject: define
      ? 'Définissez votre mot de passe PsychoTech'
      : 'Réinitialisez votre mot de passe PsychoTech',
    html: renderHtml(content),
    text: renderText(content, plainBody),
  };
}

export function buildNoticeEmail(input: NoticeEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const [first, ...rest] = input.paragraphs;
  const content: EmailContent = {
    title: input.title,
    intro: `Bonjour ${input.firstName},`,
    body: escapeHtml(first ?? ''),
    cta: null,
    afterCta: null,
    fallbackLink: null,
    outro: rest.join(' '),
    baseUrl: input.baseUrl,
  };
  return {
    subject: input.title,
    html: renderHtml(content),
    text: renderText(content, first ?? ''),
  };
}
